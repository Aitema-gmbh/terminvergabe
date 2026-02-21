/**
 * aitema|Termin - D1: Wartelisten-API
 *
 * POST   /api/v1/:tenantSlug/waitlist              – auf Warteliste eintragen
 * GET    /api/v1/:tenantSlug/waitlist               – alle Eintraege (Staff)
 * DELETE /api/v1/:tenantSlug/waitlist/:id           – Eintrag entfernen
 * GET    /api/v1/:tenantSlug/waitlist/offer/:token  – Angebot-Daten lesen
 * POST   /api/v1/:tenantSlug/waitlist/offer/:token/confirm – bestaetigen/ablehnen
 */
import { FastifyInstance } from "fastify";
import { prisma } from "../../server.js";
import { processWaitlistForSlot } from "./waitlist.job.js";

export async function waitlistRoutes(app: FastifyInstance) {

  // POST / – Auf Warteliste eintragen
  app.post("/", async (request, reply) => {
    const tenantId = request.tenantId!;
    const { serviceId, locationId, name, phone, email, preferredDates } = request.body as any;

    if (!serviceId || !name || !phone) {
      return reply.code(400).send({ error: "serviceId, name und phone sind erforderlich." });
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId, active: true },
      select: { id: true, name: true },
    });
    if (!service) return reply.code(404).send({ error: "Service nicht gefunden." });

    const entry = await prisma.waitlistEntry.create({
      data: {
        tenantId,
        serviceId,
        locationId: locationId || null,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        preferredDates: preferredDates || null,
        status: "WAITING",
      },
    });

    const position = await getWaitlistPosition(tenantId, serviceId, entry.id);

    return reply.code(201).send({
      success: true,
      message: "Sie wurden erfolgreich auf die Warteliste eingetragen.",
      id: entry.id,
      position,
    });
  });

  // GET / – Alle Eintraege (Staff)
  app.get("/", async (request, reply) => {
    const tenantId = request.tenantId!;
    const { serviceId, status } = request.query as { serviceId?: string; status?: string };

    const entries = await prisma.waitlistEntry.findMany({
      where: {
        tenantId,
        ...(serviceId ? { serviceId } : {}),
        ...(status ? { status: status as any } : { status: { in: ["WAITING", "OFFERED"] } }),
      },
      include: {
        service: { select: { name: true, icon: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const byService: Record<string, { serviceName: string; count: number }> = {};
    for (const e of entries) {
      if (!byService[e.serviceId]) {
        byService[e.serviceId] = { serviceName: e.service.name, count: 0 };
      }
      byService[e.serviceId].count++;
    }

    return { total: entries.length, byService, entries };
  });

  // DELETE /:id – Eintrag entfernen
  app.delete("/:id", async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params as { id: string };

    const entry = await prisma.waitlistEntry.findFirst({ where: { id, tenantId } });
    if (!entry) return reply.code(404).send({ error: "Eintrag nicht gefunden." });

    await prisma.waitlistEntry.update({ where: { id }, data: { status: "CANCELLED" } });
    return { success: true, message: "Wartelisten-Eintrag wurde entfernt." };
  });

  // GET /offer/:token – Angebot-Daten lesen (public)
  app.get("/offer/:token", async (request, reply) => {
    const { token } = request.params as { token: string };

    const entry = await prisma.waitlistEntry.findUnique({
      where: { token },
      include: {
        service: { select: { name: true, description: true } },
        location: { select: { name: true, address: true } },
      },
    });

    if (!entry) return reply.code(404).send({ error: "Angebot nicht gefunden." });
    if (entry.status === "EXPIRED" || (entry.expiresAt && entry.expiresAt < new Date())) {
      return reply.code(410).send({ error: "Dieses Angebot ist abgelaufen." });
    }
    if (entry.status !== "OFFERED") {
      return reply.code(400).send({ error: "Kein aktives Angebot fuer diesen Link." });
    }

    return {
      id: entry.id,
      name: entry.name,
      service: entry.service.name,
      location: entry.location?.name,
      locationAddress: entry.location?.address,
      offeredSlotStart: entry.offeredSlotStart,
      offeredSlotEnd: entry.offeredSlotEnd,
      expiresAt: entry.expiresAt,
      status: entry.status,
    };
  });

  // POST /offer/:token/confirm – Bestaetigen oder Ablehnen
  app.post("/offer/:token/confirm", async (request, reply) => {
    const { token } = request.params as { token: string };
    const { action } = request.body as { action: "confirm" | "decline" };

    const entry = await prisma.waitlistEntry.findUnique({
      where: { token },
      include: { service: { select: { name: true } } },
    });

    if (!entry) return reply.code(404).send({ error: "Angebot nicht gefunden." });
    if (entry.status !== "OFFERED") {
      return reply.code(400).send({ error: "Dieses Angebot ist nicht mehr verfuegbar." });
    }
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      await prisma.waitlistEntry.update({ where: { id: entry.id }, data: { status: "EXPIRED" } });
      return reply.code(410).send({ error: "Das Angebot ist abgelaufen." });
    }

    if (action === "confirm") {
      const bookingCode = `WL-${Date.now()}`;
      const locationId = entry.locationId || await getDefaultLocation(entry.tenantId);

      await prisma.appointment.create({
        data: {
          tenantId: entry.tenantId,
          locationId,
          serviceId: entry.serviceId,
          citizenName: entry.name,
          citizenPhone: entry.phone,
          citizenEmail: entry.email,
          scheduledStart: entry.offeredSlotStart!,
          scheduledEnd: entry.offeredSlotEnd!,
          status: "BOOKED",
          source: "WAITLIST",
          bookingCode,
          smsOptIn: true,
        },
      });

      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
      });

      return {
        success: true,
        message: "Termin erfolgreich bestaetigt!",
        bookingCode,
        scheduledStart: entry.offeredSlotStart,
      };
    } else {
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: "DECLINED", declinedAt: new Date() },
      });

      setImmediate(() => {
        processWaitlistForSlot(
          entry.tenantId,
          entry.serviceId,
          entry.locationId,
          entry.offeredSlotStart!,
          entry.offeredSlotEnd!
        ).catch(console.error);
      });

      return { success: true, message: "Angebot abgelehnt. Der naechste Interessent wird benachrichtigt." };
    }
  });
}

async function getWaitlistPosition(tenantId: string, serviceId: string, entryId: string): Promise<number> {
  const entries = await prisma.waitlistEntry.findMany({
    where: { tenantId, serviceId, status: "WAITING" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const pos = entries.findIndex((e) => e.id === entryId);
  return pos >= 0 ? pos + 1 : entries.length;
}

async function getDefaultLocation(tenantId: string): Promise<string> {
  const loc = await prisma.location.findFirst({
    where: { tenantId, active: true },
    select: { id: true },
  });
  if (!loc) throw new Error("Keine aktive Filiale gefunden.");
  return loc.id;
}
