import { prisma, redis } from "../../server.js";
import {
  generateSlots,
  generateSlotsForDay,
  isSlotAvailable,
  getGermanPublicHolidays,
  type SlotGeneratorConfig,
  type OpeningHoursInput,
  type ClosedDayInput,
} from "../../lib/slot-generator.js";
import {
  type CreateBookingInput,
  type GetAvailableSlotsInput,
  type GetAvailableDaysInput,
} from "./booking.schema.js";
import { addMinutes, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO, addDays, addHours } from "date-fns";
import { nanoid } from "nanoid";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { getConfig } from "../../config.js";

const config = getConfig();
const notificationQueue = new Queue("notifications", {
  connection: new Redis(config.REDIS_URL),
});

// Lock duration for slot reservation during booking (5 minutes)
const SLOT_LOCK_TTL = 300;

/**
 * Build the slot generator configuration from database entities.
 */
async function buildSlotConfig(
  tenantId: string,
  locationId: string,
  serviceId: string,
  startDate: Date,
  endDate: Date
): Promise<SlotGeneratorConfig> {
  const [tenant, service, openingHours, closedDays, bookedSlots] =
    await Promise.all([
      prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: {
          timezone: true,
          slotBufferMinutes: true,
        },
      }),
      prisma.service.findUniqueOrThrow({
        where: { id: serviceId },
        select: {
          durationMinutes: true,
          bufferAfterMinutes: true,
          maxParallelBookings: true,
        },
      }),
      prisma.openingHours.findMany({
        where: { locationId, active: true },
        select: {
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
          breakStart: true,
          breakEnd: true,
        },
      }),
      prisma.closedDay.findMany({
        where: { locationId },
        select: { date: true, recurring: true },
      }),
      prisma.timeSlot.findMany({
        where: {
          serviceId,
          resource: { locationId },
          date: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
          status: { in: ["BOOKED", "RESERVED", "BLOCKED"] },
        },
        select: { startTime: true },
      }),
    ]);

  // Add German public holidays
  const year = startDate.getFullYear();
  const publicHolidays = getGermanPublicHolidays(year);
  const allClosedDays: ClosedDayInput[] = [
    ...closedDays.map((cd) => ({ date: cd.date, recurring: cd.recurring })),
    ...publicHolidays,
  ];

  return {
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferAfterMinutes,
    slotBufferMinutes: tenant.slotBufferMinutes,
    openingHours: openingHours as OpeningHoursInput[],
    closedDays: allClosedDays,
    timezone: tenant.timezone,
    bookedSlots: bookedSlots.map((s) => s.startTime),
    maxParallelBookings: service.maxParallelBookings,
  };
}

/**
 * Get available time slots for a specific date.
 */
export async function getAvailableSlots(
  tenantId: string,
  input: GetAvailableSlotsInput
) {
  const date = parseISO(input.date);

  // Check cache
  const cacheKey = `slots:${tenantId}:${input.locationId}:${input.serviceId}:${input.date}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const slotConfig = await buildSlotConfig(
    tenantId,
    input.locationId,
    input.serviceId,
    date,
    date
  );

  // Filter out past slots
  const now = new Date();
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { minAdvanceBookingHours: true },
  });
  const minBookingTime = addHours(now, tenant.minAdvanceBookingHours);

  const slots = generateSlotsForDay(date, slotConfig)
    .filter((slot) => slot.startTime >= minBookingTime)
    .map((slot) => ({
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
    }));

  // Cache for 2 minutes
  await redis.set(cacheKey, JSON.stringify(slots), "EX", 120);

  return slots;
}

/**
 * Get available days for a month (days that have at least one slot).
 */
export async function getAvailableDays(
  tenantId: string,
  input: GetAvailableDaysInput
) {
  const monthStart = startOfMonth(parseISO(`${input.month}-01`));
  const monthEnd = endOfMonth(monthStart);

  const slotConfig = await buildSlotConfig(
    tenantId,
    input.locationId,
    input.serviceId,
    monthStart,
    monthEnd
  );

  const now = new Date();
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { minAdvanceBookingHours: true, maxAdvanceBookingDays: true },
  });

  const minBookingTime = addHours(now, tenant.minAdvanceBookingHours);
  const maxBookingDate = addDays(now, tenant.maxAdvanceBookingDays);

  const allSlots = generateSlots(monthStart, monthEnd, slotConfig);

  // Group by date and filter
  const dayMap = new Map<string, number>();
  for (const slot of allSlots) {
    if (slot.startTime < minBookingTime || slot.startTime > maxBookingDate) {
      continue;
    }
    const dayKey = slot.date.toISOString().split("T")[0];
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + 1);
  }

  return Array.from(dayMap.entries()).map(([date, availableSlots]) => ({
    date,
    availableSlots,
  }));
}

/**
 * Generate a unique booking code like "MUC-AB12CD".
 */
function generateBookingCode(tenantSlug: string): string {
  const prefix = tenantSlug.substring(0, 3).toUpperCase();
  const code = nanoid(6).toUpperCase();
  return `${prefix}-${code}`;
}

/**
 * Create a new appointment booking.
 *
 * Uses Redis-based distributed locking to prevent double-booking.
 */
export async function createBooking(
  tenantId: string,
  tenantSlug: string,
  input: CreateBookingInput
) {
  const slotStart = parseISO(input.slotStart);
  const lockKey = `lock:slot:${input.locationId}:${input.serviceId}:${slotStart.getTime()}`;

  // Acquire distributed lock
  const lockAcquired = await redis.set(lockKey, "1", "EX", SLOT_LOCK_TTL, "NX");
  if (!lockAcquired) {
    throw { statusCode: 409, message: "Dieser Zeitslot wird gerade von jemand anderem gebucht. Bitte wählen Sie einen anderen." };
  }

  try {
    // Verify slot is still available
    const slotConfig = await buildSlotConfig(
      tenantId,
      input.locationId,
      input.serviceId,
      slotStart,
      slotStart
    );

    if (!isSlotAvailable(slotStart, slotConfig)) {
      throw { statusCode: 409, message: "Dieser Zeitslot ist nicht mehr verfügbar." };
    }

    const service = await prisma.service.findUniqueOrThrow({
      where: { id: input.serviceId },
    });

    const slotEnd = addMinutes(slotStart, service.durationMinutes);
    const bookingCode = generateBookingCode(tenantSlug);

    // Find a suitable resource (first available)
    let resourceId = input.resourceId;
    if (!resourceId) {
      const availableResource = await prisma.resource.findFirst({
        where: {
          locationId: input.locationId,
          active: true,
          resourceServices: { some: { serviceId: input.serviceId } },
        },
      });
      resourceId = availableResource?.id;
    }

    // Create appointment and time slot in a transaction
    const appointment = await prisma.$transaction(async (tx) => {
      // Create time slot
      let timeSlotId: string | undefined;
      if (resourceId) {
        const timeSlot = await tx.timeSlot.create({
          data: {
            resourceId,
            serviceId: input.serviceId,
            date: startOfDay(slotStart),
            startTime: slotStart,
            endTime: slotEnd,
            status: "BOOKED",
          },
        });
        timeSlotId = timeSlot.id;
      }

      // Find or create citizen
      let citizenId: string | undefined;
      if (input.citizenEmail) {
        const citizen = await tx.citizen.upsert({
          where: {
            // Use composite-ish approach: find by tenant + email
            id: (
              await tx.citizen.findFirst({
                where: { tenantId, email: input.citizenEmail },
                select: { id: true },
              })
            )?.id ?? "nonexistent",
          },
          create: {
            tenantId,
            email: input.citizenEmail,
            phone: input.citizenPhone,
            firstName: input.citizenName.split(" ")[0],
            lastName: input.citizenName.split(" ").slice(1).join(" "),
            preferredLanguage: input.preferredLanguage,
          },
          update: {
            phone: input.citizenPhone || undefined,
          },
        });
        citizenId = citizen.id;
      }

      // Create appointment
      const appt = await tx.appointment.create({
        data: {
          locationId: input.locationId,
          serviceId: input.serviceId,
          resourceId,
          timeSlotId,
          citizenId,
          bookingCode,
          scheduledStart: slotStart,
          scheduledEnd: slotEnd,
          citizenName: input.citizenName,
          citizenEmail: input.citizenEmail,
          citizenPhone: input.citizenPhone,
          status: "CONFIRMED",
          source: "ONLINE",
          notes: input.notes,
        },
        include: {
          service: { select: { name: true, durationMinutes: true, requiresDocuments: true, fee: true } },
          location: { select: { name: true, address: true, city: true } },
        },
      });

      return appt;
    });

    // Invalidate slot cache
    const dateStr = slotStart.toISOString().split("T")[0];
    await redis.del(`slots:${tenantId}:${input.locationId}:${input.serviceId}:${dateStr}`);

    // Queue confirmation notification
    if (input.citizenEmail) {
      await notificationQueue.add("booking-confirmation", {
        tenantId,
        type: "BOOKING_CONFIRMATION",
        channel: "EMAIL",
        recipient: input.citizenEmail,
        appointmentId: appointment.id,
        bookingCode,
        data: {
          citizenName: input.citizenName,
          serviceName: appointment.service.name,
          locationName: appointment.location.name,
          locationAddress: `${appointment.location.address}, ${appointment.location.city}`,
          scheduledStart: slotStart.toISOString(),
          scheduledEnd: slotEnd.toISOString(),
          bookingCode,
          requiredDocuments: appointment.service.requiresDocuments,
          fee: appointment.service.fee,
        },
      });
    }

    return {
      id: appointment.id,
      bookingCode,
      status: appointment.status,
      scheduledStart: appointment.scheduledStart,
      scheduledEnd: appointment.scheduledEnd,
      service: appointment.service,
      location: appointment.location,
    };
  } finally {
    // Release lock
    await redis.del(lockKey);
  }
}

/**
 * Cancel an appointment.
 */
export async function cancelBooking(
  tenantId: string,
  bookingCode: string,
  reason?: string
) {
  const appointment = await prisma.appointment.findUnique({
    where: { bookingCode },
    include: {
      service: { select: { name: true } },
      location: { select: { name: true } },
    },
  });

  if (!appointment) {
    throw { statusCode: 404, message: "Termin nicht gefunden." };
  }

  if (appointment.status === "CANCELLED") {
    throw { statusCode: 400, message: "Termin ist bereits storniert." };
  }

  if (["COMPLETED", "IN_PROGRESS"].includes(appointment.status)) {
    throw { statusCode: 400, message: "Termin kann nicht mehr storniert werden." };
  }

  // Check cancellation deadline
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { cancellationDeadlineHours: true },
  });

  const deadline = addHours(new Date(), tenant.cancellationDeadlineHours);
  if (appointment.scheduledStart < deadline) {
    throw {
      statusCode: 400,
      message: `Stornierung nur bis ${tenant.cancellationDeadlineHours} Stunden vor dem Termin möglich.`,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Free the time slot
    if (appointment.timeSlotId) {
      await tx.timeSlot.update({
        where: { id: appointment.timeSlotId },
        data: { status: "AVAILABLE" },
      });
    }

    // Cancel the appointment
    return tx.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
  });

  // Invalidate cache
  const dateStr = appointment.scheduledStart.toISOString().split("T")[0];
  await redis.del(
    `slots:${tenantId}:${appointment.locationId}:${appointment.serviceId}:${dateStr}`
  );

  // Queue cancellation notification
  if (appointment.citizenEmail) {
    await notificationQueue.add("booking-cancellation", {
      tenantId,
      type: "BOOKING_CANCELLATION",
      channel: "EMAIL",
      recipient: appointment.citizenEmail,
      data: {
        citizenName: appointment.citizenName,
        serviceName: appointment.service.name,
        locationName: appointment.location.name,
        bookingCode: appointment.bookingCode,
      },
    });
  }

  return { success: true, message: "Termin wurde storniert." };
}

/**
 * Look up an appointment by booking code.
 */
export async function lookupBooking(bookingCode: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { bookingCode },
    include: {
      service: {
        select: { name: true, durationMinutes: true, requiresDocuments: true, fee: true },
      },
      location: {
        select: { name: true, address: true, city: true, zipCode: true },
      },
    },
  });

  if (!appointment) {
    throw { statusCode: 404, message: "Termin nicht gefunden." };
  }

  return {
    bookingCode: appointment.bookingCode,
    status: appointment.status,
    scheduledStart: appointment.scheduledStart,
    scheduledEnd: appointment.scheduledEnd,
    service: appointment.service,
    location: appointment.location,
    citizenName: appointment.citizenName,
    createdAt: appointment.createdAt,
  };
}
