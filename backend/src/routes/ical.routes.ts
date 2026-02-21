/**
 * aitema|Termin - iCal Export Routes (T1)
 *
 * GET /api/v1/appointments/:bookingCode/ical
 * Gibt eine .ics-Datei fuer den Kalenderexport zurueck.
 * Funktioniert mit bookingCode (Modul-System) und bookingRef (Legacy).
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
import ICalCalendar from 'ical-generator';

export async function icalRoutes(app: FastifyInstance) {
  // ─── iCal Download via bookingCode (Modul-System) ─────────────────────────
  app.get('/api/v1/appointments/:bookingCode/ical', async (request: FastifyRequest, reply: FastifyReply) => {
    const { bookingCode } = request.params as { bookingCode: string };

    try {
      // Versuche erst bookingCode (neues System), dann bookingRef (altes System)
      let appointment: any = null;

      // Neues Schema: bookingCode + scheduledStart
      try {
        appointment = await app.prisma.appointment.findUnique({
          where: { bookingCode },
          include: { service: true, location: true },
        });
      } catch {
        // bookingCode Feld existiert noch nicht im Schema → fallback auf bookingRef
      }

      // Altes Schema: bookingRef + startTime
      if (!appointment) {
        appointment = await app.prisma.appointment.findFirst({
          where: { bookingRef: bookingCode },
          include: { service: true, location: true },
        });
      }

      if (!appointment) {
        return reply.code(404).send({ error: 'Termin nicht gefunden' });
      }

      // Normalisiere Felder (neues und altes Schema kompatibel)
      const startTime: Date = appointment.scheduledStart ?? appointment.startTime;
      const endTime: Date = appointment.scheduledEnd
        ?? appointment.endTime
        ?? new Date(startTime.getTime() + ((appointment.service?.durationMinutes ?? appointment.service?.duration ?? 30) * 60000));
      const ref: string = appointment.bookingCode ?? appointment.bookingRef ?? appointment.id;
      const locationAddr: string | undefined =
        appointment.location?.address
          ? `${appointment.location.address}${appointment.location.city ? ', ' + appointment.location.city : ''}`
          : appointment.location?.name;

      const cal = ICalCalendar({ name: 'aitema|Termin' });
      cal.createEvent({
        start: startTime,
        end: endTime,
        summary: `${appointment.service?.name ?? 'Termin'} – ${appointment.location?.name ?? 'Buergeramt'}`,
        location: locationAddr,
        id: `booking-${ref}@aitema.de`,
        url: `https://termin.aitema.de/status?ref=${ref}`,
        description: `Buchungsnummer: ${ref}\nName: ${appointment.citizenName}`,
        organizer: {
          name: appointment.location?.name ?? 'aitema|Termin',
          email: (appointment.location?.email as string | undefined) ?? 'termin@aitema.de',
        },
      });

      reply.header('Content-Type', 'text/calendar; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="termin-${ref}.ics"`);
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');

      return cal.toString();
    } catch (err: any) {
      app.log.error(err, 'iCal generation failed');
      return reply.code(500).send({ error: err.message });
    }
  });
}
