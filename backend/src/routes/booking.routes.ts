/**
 * aitema|Termin - Booking API Routes
 * 
 * Fastify routes for appointment booking and queue management.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
import { bookingService } from '../services/booking.service';
import { calculateNoShowRisk, getRiskLevel } from '../services/noshow-risk.service';

export async function bookingRoutes(app: FastifyInstance) {
  
  // ============================================================
  // Public: Slot Availability
  // ============================================================
  app.get('/api/v1/:tenantSlug/slots', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantSlug } = request.params as { tenantSlug: string };
    const { locationId, serviceId, date } = request.query as {
      locationId: string;
      serviceId: string;
      date: string;
    };

    if (!locationId || !serviceId || !date) {
      return reply.code(400).send({ error: 'locationId, serviceId und date sind erforderlich' });
    }

    try {
      // Resolve tenant
      const tenant = await app.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant || !tenant.active) {
        return reply.code(404).send({ error: 'Kommune nicht gefunden' });
      }

      const slots = await bookingService.getAvailableSlots(
        tenant.id, locationId, serviceId, new Date(date)
      );

      return { date, locationId, serviceId, slots };
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ============================================================
  // Public: Book Appointment
  // ============================================================
  app.post('/api/v1/:tenantSlug/book', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantSlug } = request.params as { tenantSlug: string };
    const body = request.body as any;

    try {
      const tenant = await app.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant || !tenant.active) {
        return reply.code(404).send({ error: 'Kommune nicht gefunden' });
      }

      const appointment = await bookingService.bookAppointment({
        tenantId: tenant.id,
        ...body,
      });

      return reply.code(201).send({
        success: true,
        bookingRef: appointment.bookingRef,
        appointment,
      });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ============================================================
  // Public: Cancel Appointment
  // ============================================================
  app.post('/api/v1/appointments/:bookingRef/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { bookingRef } = request.params as { bookingRef: string };

    try {
      const result = await bookingService.cancelAppointment(bookingRef);
      return { success: true, appointment: result };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ============================================================
  // Public: Check-in
  // ============================================================
  app.post('/api/v1/appointments/:bookingRef/checkin', async (request: FastifyRequest, reply: FastifyReply) => {
    const { bookingRef } = request.params as { bookingRef: string };

    try {
      const result = await bookingService.checkIn(bookingRef);
      return { success: true, appointment: result };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ============================================================
  // Public: Queue - Get Ticket (Walk-in)
  // ============================================================
  app.post('/api/v1/:tenantSlug/queue/ticket', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantSlug } = request.params as { tenantSlug: string };
    const { locationId, serviceId, citizenName } = request.body as any;

    try {
      const tenant = await app.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant) return reply.code(404).send({ error: 'Kommune nicht gefunden' });

      const entry = await bookingService.createQueueEntry(
        tenant.id, locationId, serviceId, citizenName
      );

      return reply.code(201).send({
        success: true,
        ticketNumber: entry.ticketNumber,
        estimatedWait: entry.estimatedWait,
        entry,
      });
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ============================================================
  // Public: Queue Display (for display boards)
  // ============================================================
  app.get('/api/v1/:tenantSlug/queue/display/:locationId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantSlug, locationId } = request.params as { tenantSlug: string; locationId: string };

    try {
      const tenant = await app.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (!tenant) return reply.code(404).send({ error: 'Kommune nicht gefunden' });

      const display = await bookingService.getQueueDisplay(tenant.id, locationId);
      return display;
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ============================================================
  // Staff: Call Next
  // ============================================================
  app.post('/api/v1/staff/queue/call-next', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, locationId, counterId, serviceId } = request.body as any;

    try {
      const result = await bookingService.callNext(tenantId, locationId, counterId, serviceId);
      if (!result) {
        return { success: false, message: 'Keine wartenden Personen' };
      }
      return { success: true, entry: result };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ============================================================
  // Public: Services List
  // ============================================================
  app.get('/api/v1/:tenantSlug/services', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantSlug } = request.params as { tenantSlug: string };
    const { locationId, category } = request.query as { locationId?: string; category?: string };

    const tenant = await app.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) return reply.code(404).send({ error: 'Kommune nicht gefunden' });

    const where: any = { tenantId: tenant.id, active: true };
    if (category) where.category = category;

    let services;
    if (locationId) {
      const locationServices = await app.prisma.locationService.findMany({
        where: { locationId, active: true },
        include: { service: true },
      });
      services = locationServices.map(ls => ls.service).filter(s => s.active);
      if (category) {
        services = services.filter(s => s.category === category);
      }
    } else {
      services = await app.prisma.service.findMany({
        where,
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      });
    }

    // Group by category
    const grouped: Record<string, any[]> = {};
    for (const s of services) {
      const cat = s.category || 'Sonstiges';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    }

    return { services, categories: grouped };
  });

  // ============================================================
  // Public: Locations List
  // ============================================================
  app.get('/api/v1/:tenantSlug/locations', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantSlug } = request.params as { tenantSlug: string };

    const tenant = await app.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) return reply.code(404).send({ error: 'Kommune nicht gefunden' });

    const locations = await app.prisma.location.findMany({
      where: { tenantId: tenant.id, active: true },
      include: {
        services: {
          where: { active: true },
          include: { service: true },
        },
      },
    });

    return { locations };
  });

  // ============================================================
  // Staff: Risk Score for Appointment
  // ============================================================
  app.get('/api/v1/bookings/:id/risk-score', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const booking = await app.prisma.appointment.findUnique({
      where: { id },
    });
    if (!booking) return reply.status(404).send({ error: 'Not found' });

    // Historische Buchungen des Buergers (anhand Name + E-Mail als Identifikator)
    const pastBookings = await app.prisma.appointment.count({
      where: {
        citizenEmail: booking.citizenEmail || undefined,
        id: { not: booking.id },
      },
    });

    const now = new Date();
    const appointmentDate = booking.startTime;
    const bookingCreated = booking.createdAt;

    const factors = {
      bookingLeadDays: Math.floor(
        (appointmentDate.getTime() - bookingCreated.getTime()) / (1000 * 60 * 60 * 24)
      ),
      appointmentHour: appointmentDate.getHours(),
      appointmentDayOfWeek: appointmentDate.getDay(),
      hasPhone: !!booking.citizenPhone,
      isFirstBooking: pastBookings === 0,
      bookingLeadMinutes: Math.floor(
        (appointmentDate.getTime() - now.getTime()) / (1000 * 60)
      ),
    };

    const score = calculateNoShowRisk(factors);
    const level = getRiskLevel(score);

    return { score, level, factors, bookingId: id };
  });
}
