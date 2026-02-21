/**
 * aitema|Termin - Booking Service
 * 
 * Core booking engine handling:
 * - Slot availability calculation
 * - Appointment creation with conflict detection
 * - Booking reference generation
 * - Check-in and queue management
 */
import { PrismaClient, AppointmentStatus, QueueStatus } from '@prisma/client';
import { generateQrDataUrl } from './qrcode.service.js';

const prisma = new PrismaClient();

export class BookingService {
  
  /**
   * Generate unique booking reference: TRM-{YEAR}-{SEQ}
   */
  async generateBookingRef(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.appointment.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `TRM-${year}-${seq}`;
  }

  /**
   * Get available time slots for a service at a location on a date.
   */
  async getAvailableSlots(
    tenantId: string,
    locationId: string,
    serviceId: string,
    date: Date,
  ): Promise<TimeSlot[]> {
    // 1. Get service duration
    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, active: true },
    });
    if (!service) throw new Error('Service nicht gefunden');

    const slotDuration = service.duration + service.bufferTime;

    // 2. Get opening hours for this day
    const dayOfWeek = (date.getDay() + 6) % 7; // Monday=0
    const dateStr = date.toISOString().split('T')[0];
    
    const openingHours = await prisma.openingHours.findFirst({
      where: {
        locationId,
        OR: [
          { specificDate: new Date(dateStr) },
          { dayOfWeek, specificDate: null },
        ],
      },
      orderBy: { specificDate: 'desc' }, // Specific date overrides
    });

    if (!openingHours || openingHours.closed) return [];

    // 3. Get existing appointments for this slot
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        locationId,
        date: new Date(dateStr),
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startTime: true, endTime: true },
    });

    // 4. Generate available slots
    const slots: TimeSlot[] = [];
    const [openH, openM] = openingHours.openTime.split(':').map(Number);
    const [closeH, closeM] = openingHours.closeTime.split(':').map(Number);

    let current = new Date(date);
    current.setHours(openH, openM, 0, 0);

    const closing = new Date(date);
    closing.setHours(closeH, closeM, 0, 0);

    while (current.getTime() + slotDuration * 60000 <= closing.getTime()) {
      const slotEnd = new Date(current.getTime() + service.duration * 60000);
      
      // Check for conflicts
      const hasConflict = existingAppointments.some(apt => {
        const aptStart = new Date(apt.startTime).getTime();
        const aptEnd = new Date(apt.endTime).getTime();
        return current.getTime() < aptEnd && slotEnd.getTime() > aptStart;
      });

      if (!hasConflict) {
        slots.push({
          start: new Date(current),
          end: slotEnd,
          available: true,
        });
      }

      // Move to next slot
      current = new Date(current.getTime() + slotDuration * 60000);
    }

    // Filter past slots for today
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return slots.filter(s => s.start > now);
    }

    return slots;
  }

  /**
   * Book an appointment.
   */
  async bookAppointment(data: BookAppointmentInput): Promise<any> {
    const { tenantId, locationId, serviceId, date, startTime, citizenName, citizenEmail, citizenPhone } = data;

    // Validate slot is still available
    const slots = await this.getAvailableSlots(tenantId, locationId, serviceId, new Date(date));
    const requestedSlot = slots.find(s => 
      s.start.getTime() === new Date(startTime).getTime()
    );
    
    if (!requestedSlot) {
      throw new Error('Der gewaehlte Termin ist nicht mehr verfuegbar.');
    }

    // Check max bookings per person
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });
    
    if (settings && citizenEmail) {
      const existingCount = await prisma.appointment.count({
        where: {
          tenantId,
          citizenEmail,
          status: { in: ['BOOKED', 'CONFIRMED'] },
          date: { gte: new Date() },
        },
      });
      if (existingCount >= settings.maxBookingsPerPerson) {
        throw new Error(
          `Maximale Anzahl gleichzeitiger Buchungen (${settings.maxBookingsPerPerson}) erreicht.`
        );
      }
    }

    // Generate booking reference
    const bookingRef = await this.generateBookingRef(tenantId);

    // Get service for duration
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new Error('Service nicht gefunden');

    const endTime = new Date(new Date(startTime).getTime() + service.duration * 60000);

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        locationId,
        serviceId,
        date: new Date(date),
        startTime: new Date(startTime),
        endTime,
        citizenName,
        citizenEmail: citizenEmail || undefined,
        citizenPhone: citizenPhone || undefined,
        bookingRef,
        status: 'BOOKED',
      },
      include: {
        service: true,
        location: true,
      },
    });

    // T2: QR-Code generieren und speichern
    const qrCodeDataUrl = await generateQrDataUrl(bookingRef);
    if (qrCodeDataUrl) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { qrCodeDataUrl },
      });
      appointment.qrCodeDataUrl = qrCodeDataUrl;
    }

    return appointment;
  }

  /**
   * Cancel an appointment.
   */
  async cancelAppointment(bookingRef: string): Promise<any> {
    const appointment = await prisma.appointment.findUnique({
      where: { bookingRef },
    });
    
    if (!appointment) throw new Error('Termin nicht gefunden');
    if (appointment.status === 'CANCELLED') throw new Error('Termin bereits storniert');
    if (appointment.status === 'COMPLETED') throw new Error('Abgeschlossener Termin kann nicht storniert werden');

    return prisma.appointment.update({
      where: { bookingRef },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Check in a citizen for their appointment.
   */
  async checkIn(bookingRef: string): Promise<any> {
    const appointment = await prisma.appointment.findUnique({
      where: { bookingRef },
    });
    
    if (!appointment) throw new Error('Termin nicht gefunden');
    if (appointment.status !== 'BOOKED' && appointment.status !== 'CONFIRMED') {
      throw new Error('Termin kann nicht eingecheckt werden (Status: ' + appointment.status + ')');
    }

    return prisma.appointment.update({
      where: { bookingRef },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
      },
    });
  }

  /**
   * Create a walk-in queue entry (Wartenummer).
   */
  async createQueueEntry(
    tenantId: string,
    locationId: string,
    serviceId: string,
    citizenName?: string,
  ): Promise<any> {
    // Generate ticket number
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const count = await prisma.queueEntry.count({
      where: {
        tenantId,
        locationId,
        createdAt: { gte: today },
      },
    });
    
    // Service-based prefix: A, B, C...
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    const prefix = service?.category?.[0]?.toUpperCase() || 'A';
    const ticketNumber = `${prefix}${String(count + 1).padStart(3, '0')}`;

    // Estimate wait time
    const waitingCount = await prisma.queueEntry.count({
      where: {
        tenantId,
        locationId,
        serviceId,
        status: 'WAITING',
      },
    });
    const avgDuration = service?.duration || 15;
    const estimatedWait = waitingCount * avgDuration;

    return prisma.queueEntry.create({
      data: {
        tenantId,
        locationId,
        serviceId,
        ticketNumber,
        citizenName: citizenName || undefined,
        estimatedWait,
        status: 'WAITING',
      },
      include: {
        service: true,
        location: true,
      },
    });
  }

  /**
   * Call next person from queue.
   */
  async callNext(
    tenantId: string,
    locationId: string,
    counterId: string,
    serviceId?: string,
  ): Promise<any> {
    // Find next waiting entry (prioritized)
    const where: any = {
      tenantId,
      locationId,
      status: 'WAITING',
    };
    if (serviceId) where.serviceId = serviceId;

    const next = await prisma.queueEntry.findFirst({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    if (!next) return null;

    return prisma.queueEntry.update({
      where: { id: next.id },
      data: {
        status: 'CALLED',
        counterId,
        calledAt: new Date(),
      },
      include: {
        service: true,
        counter: true,
      },
    });
  }

  /**
   * Get queue display data for a location (for display boards).
   */
  async getQueueDisplay(tenantId: string, locationId: string): Promise<QueueDisplayData> {
    const [waiting, called, inProgress] = await Promise.all([
      prisma.queueEntry.findMany({
        where: { tenantId, locationId, status: 'WAITING' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: { service: true },
      }),
      prisma.queueEntry.findMany({
        where: { tenantId, locationId, status: 'CALLED' },
        include: { service: true, counter: true },
        orderBy: { calledAt: 'desc' },
        take: 5,
      }),
      prisma.queueEntry.findMany({
        where: { tenantId, locationId, status: 'IN_PROGRESS' },
        include: { service: true, counter: true },
      }),
    ]);

    return {
      locationId,
      timestamp: new Date(),
      waiting: waiting.map(w => ({
        ticketNumber: w.ticketNumber,
        service: w.service.name,
        estimatedWait: w.estimatedWait,
        position: waiting.indexOf(w) + 1,
      })),
      called: called.map(c => ({
        ticketNumber: c.ticketNumber,
        counter: c.counter?.name || `Schalter ${c.counter?.number}`,
        service: c.service.name,
      })),
      inProgress: inProgress.length,
      totalWaiting: waiting.length,
    };
  }
}

// Types
interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

interface BookAppointmentInput {
  tenantId: string;
  locationId: string;
  serviceId: string;
  date: string;
  startTime: string;
  citizenName: string;
  citizenEmail?: string;
  citizenPhone?: string;
}

interface QueueDisplayData {
  locationId: string;
  timestamp: Date;
  waiting: { ticketNumber: string; service: string; estimatedWait: number | null; position: number }[];
  called: { ticketNumber: string; counter: string; service: string }[];
  inProgress: number;
  totalWaiting: number;
}

export const bookingService = new BookingService();
