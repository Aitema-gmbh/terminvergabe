/**
 * aitema|Termin - PDF API Routes
 *
 * Fastify routes for generating booking confirmations and queue tickets
 * as HTML (can be rendered to PDF by the client via print or a headless browser).
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pdfService } from '../services/pdf.service';

export async function pdfRoutes(app: FastifyInstance) {

  // ============================================================
  // GET /api/v1/pdf/booking/:bookingRef
  // Returns an HTML booking confirmation page
  // ============================================================
  app.get('/api/v1/pdf/booking/:bookingRef', async (request: FastifyRequest, reply: FastifyReply) => {
    const { bookingRef } = request.params as { bookingRef: string };

    try {
      const appointment = await app.prisma.appointment.findUnique({
        where: { bookingRef },
        include: {
          location: true,
          service: true,
        },
      });

      if (!appointment) {
        return reply.code(404).send({ error: 'Termin nicht gefunden' });
      }

      const html = pdfService.generateBookingConfirmation({
        bookingRef: appointment.bookingRef,
        date: appointment.date.toISOString(),
        time: appointment.time,
        locationName: appointment.location.name,
        locationAddress: [
          appointment.location.street,
          appointment.location.zip,
          appointment.location.city,
        ].filter(Boolean).join(', '),
        serviceName: appointment.service.name,
        citizenName: [appointment.firstName, appointment.lastName].filter(Boolean).join(' '),
        requiredDocuments: appointment.service.requiredDocuments ?? [],
        qrCodeDataUrl: appointment.qrCodeDataUrl ?? undefined,
        cancellationDeadline: appointment.cancellationDeadline?.toISOString(),
        accessibility: {
          wheelchairAccessible: appointment.location.wheelchairAccessible ?? false,
          elevator: appointment.location.elevator ?? false,
          signLanguage: appointment.location.signLanguage ?? false,
          inductionLoop: appointment.location.inductionLoop ?? false,
        },
      });

      return reply
        .code(200)
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Cache-Control', 'private, no-store')
        .send(html);
    } catch (err: any) {
      request.log.error(err, 'PDF booking generation failed');
      return reply.code(500).send({ error: 'Bestätigung konnte nicht erstellt werden' });
    }
  });

  // ============================================================
  // GET /api/v1/pdf/ticket/:ticketId
  // Returns an HTML queue ticket page
  // ============================================================
  app.get('/api/v1/pdf/ticket/:ticketId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { ticketId } = request.params as { ticketId: string };

    try {
      const entry = await app.prisma.queueEntry.findUnique({
        where: { id: ticketId },
        include: {
          location: true,
          service: true,
        },
      });

      if (!entry) {
        return reply.code(404).send({ error: 'Wartenummer nicht gefunden' });
      }

      const html = pdfService.generateQueueTicket({
        ticketId: entry.id,
        ticketNumber: entry.ticketNumber,
        estimatedWait: entry.estimatedWait ?? 0,
        locationName: entry.location.name,
        locationAddress: [
          entry.location.street,
          entry.location.zip,
          entry.location.city,
        ].filter(Boolean).join(', '),
        serviceName: entry.service.name,
        citizenName: entry.citizenName ?? undefined,
        issuedAt: entry.createdAt.toISOString(),
      });

      return reply
        .code(200)
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Cache-Control', 'private, no-store')
        .send(html);
    } catch (err: any) {
      request.log.error(err, 'PDF ticket generation failed');
      return reply.code(500).send({ error: 'Ticket konnte nicht erstellt werden' });
    }
  });
}
