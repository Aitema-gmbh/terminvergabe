/**
 * aitema|Termin - Notification Routes
 *
 * POST   /api/notifications/push/subscribe
 * DELETE /api/notifications/push/unsubscribe
 * PUT    /api/notifications/preferences/:bookingRef
 * GET    /api/notifications/status/:bookingRef
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { pushService } from '../services/push.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Schema-Definitionen ──────────────────────────────────────────────────────

const SubscribeBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  bookingRef: z.string().min(1),
});

const UnsubscribeBody = z.object({
  endpoint: z.string().url(),
});

const PreferencesBody = z.object({
  smsOptIn: z.boolean().optional(),
  pushOptIn: z.boolean().optional(),
  emailOptIn: z.boolean().optional(),
  reminderChannels: z.array(z.enum(['sms', 'push', 'email'])).optional(),
});

const BookingRefParam = z.object({
  bookingRef: z.string().min(1),
});

// ─── Route-Handler ────────────────────────────────────────────────────────────

export async function notificationRoutes(app: FastifyInstance): Promise<void> {

  /**
   * POST /api/notifications/push/subscribe
   * Speichert eine Web-Push-Subscription.
   */
  app.post(
    '/api/notifications/push/subscribe',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parse = SubscribeBody.safeParse(req.body);
      if (!parse.success) {
        return reply.status(400).send({
          error: 'Ungueltige Anfrage',
          details: parse.error.flatten(),
        });
      }

      const { endpoint, keys, bookingRef } = parse.data;

      // Buchungsreferenz muss existieren
      const appointment = await prisma.appointment.findUnique({
        where: { bookingCode: bookingRef },
        select: { id: true },
      });

      if (!appointment) {
        return reply.status(404).send({ error: 'Buchungsreferenz nicht gefunden' });
      }

      await pushService.subscribe(endpoint, keys, bookingRef);

      // pushOptIn in DB setzen
      await prisma.appointment.update({
        where: { bookingCode: bookingRef },
        data: { pushOptIn: true },
      }).catch(() => {
        // Feld existiert moeglicherweise noch nicht – ignorieren
      });

      return reply.status(201).send({ success: true });
    },
  );

  /**
   * DELETE /api/notifications/push/unsubscribe
   * Entfernt eine Web-Push-Subscription.
   */
  app.delete(
    '/api/notifications/push/unsubscribe',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parse = UnsubscribeBody.safeParse(req.body);
      if (!parse.success) {
        return reply.status(400).send({ error: 'Endpoint fehlt' });
      }

      await pushService.unsubscribe(parse.data.endpoint);
      return reply.send({ success: true });
    },
  );

  /**
   * PUT /api/notifications/preferences/:bookingRef
   * Aktualisiert Benachrichtigungs-Praeferenzen (Opt-in/Opt-out).
   */
  app.put(
    '/api/notifications/preferences/:bookingRef',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const paramParse = BookingRefParam.safeParse(req.params);
      if (!paramParse.success) {
        return reply.status(400).send({ error: 'Ungueltige Buchungsreferenz' });
      }

      const bodyParse = PreferencesBody.safeParse(req.body);
      if (!bodyParse.success) {
        return reply.status(400).send({
          error: 'Ungueltige Praeferenzen',
          details: bodyParse.error.flatten(),
        });
      }

      const { bookingRef } = paramParse.data;
      const prefs = bodyParse.data;

      const appointment = await prisma.appointment.findUnique({
        where: { bookingCode: bookingRef },
        select: { id: true, citizenPhone: true },
      });

      if (!appointment) {
        return reply.status(404).send({ error: 'Buchungsreferenz nicht gefunden' });
      }

      // Praeferenzen in DB schreiben (Felder koennen optional sein)
      const updateData: Record<string, unknown> = {};
      if (prefs.smsOptIn !== undefined) updateData.smsOptIn = prefs.smsOptIn;
      if (prefs.pushOptIn !== undefined) updateData.pushOptIn = prefs.pushOptIn;
      if (prefs.emailOptIn !== undefined) updateData.emailOptIn = prefs.emailOptIn;
      if (prefs.reminderChannels !== undefined) {
        updateData.reminderChannels = JSON.stringify(prefs.reminderChannels);
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.appointment.update({
          where: { bookingCode: bookingRef },
          data: updateData,
        }).catch(() => {
          // Graceful: neue Felder noch nicht migriert
        });

        // Auch im citizen-Datensatz aktualisieren falls phone vorhanden
        if (appointment.citizenPhone && prefs.smsOptIn !== undefined) {
          await prisma.citizen.updateMany({
            where: { phone: appointment.citizenPhone },
            data: { smsOptIn: prefs.smsOptIn },
          }).catch(() => {});
        }
      }

      return reply.send({ success: true, updated: Object.keys(updateData) });
    },
  );

  /**
   * GET /api/notifications/status/:bookingRef
   * Gibt den aktuellen Benachrichtigungs-Status einer Buchung zurueck.
   */
  app.get(
    '/api/notifications/status/:bookingRef',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const paramParse = BookingRefParam.safeParse(req.params);
      if (!paramParse.success) {
        return reply.status(400).send({ error: 'Ungueltige Buchungsreferenz' });
      }

      const { bookingRef } = paramParse.data;

      const appointment = await prisma.appointment.findUnique({
        where: { bookingCode: bookingRef },
        select: {
          bookingCode: true,
          smsOptIn: true,
          pushOptIn: true,
          emailOptIn: true,
          reminderChannels: true,
          citizenEmail: true,
          citizenPhone: true,
        },
      });

      if (!appointment) {
        return reply.status(404).send({ error: 'Buchungsreferenz nicht gefunden' });
      }

      return reply.send({
        bookingRef,
        channels: {
          sms: {
            enabled: appointment.smsOptIn ?? false,
            hasPhone: Boolean(appointment.citizenPhone),
          },
          push: {
            enabled: appointment.pushOptIn ?? false,
          },
          email: {
            enabled: appointment.emailOptIn ?? true, // E-Mail default an
            hasEmail: Boolean(appointment.citizenEmail),
          },
        },
        reminderChannels: appointment.reminderChannels
          ? JSON.parse(appointment.reminderChannels as string)
          : ['email'],
      });
    },
  );
}
