/**
 * aitema|Termin - D1: Wartelisten-Job (BullMQ)
 *
 * Wird ausgeloest wenn ein Termin storniert wird.
 * Sucht passende WaitlistEntry, reserviert den Slot und sendet SMS.
 */
import { Queue, Worker, Job } from "bullmq";
import { prisma } from "../../server.js";
import { addHours } from "date-fns";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const OFFER_EXPIRY_HOURS = 2;
const BASE_URL = process.env.PUBLIC_URL || "https://termin.aitema.de";

// BullMQ Queue
export const waitlistQueue = new Queue("waitlist-matcher", {
  connection: { host: process.env.REDIS_HOST || "localhost", port: parseInt(process.env.REDIS_PORT || "6379"), password: process.env.REDIS_PASSWORD },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// ── Oeffentliche Funktion: Job enqueuen wenn Termin storniert wird ──────────
export async function enqueueWaitlistMatch(
  tenantId: string,
  serviceId: string,
  locationId: string | null,
  slotStart: Date,
  slotEnd: Date
): Promise<void> {
  await waitlistQueue.add(
    "match-slot",
    { tenantId, serviceId, locationId, slotStart: slotStart.toISOString(), slotEnd: slotEnd.toISOString() },
    { jobId: `waitlist-${tenantId}-${serviceId}-${slotStart.toISOString()}` }
  );
}

// ── Warteliste fuer freigewordenen Slot verarbeiten ─────────────────────────
export async function processWaitlistForSlot(
  tenantId: string,
  serviceId: string,
  locationId: string | null,
  slotStart: Date,
  slotEnd: Date
): Promise<void> {
  // Naechsten wartenden Eintrag (FIFO) finden
  const entry = await prisma.waitlistEntry.findFirst({
    where: {
      tenantId,
      serviceId,
      ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}),
      status: "WAITING",
    },
    orderBy: { createdAt: "asc" },
    include: {
      service: { select: { name: true } },
      tenant: { select: { name: true } },
    },
  });

  if (!entry) {
    console.log(`[Waitlist] Keine wartenden Eintraege fuer Service ${serviceId}`);
    return;
  }

  const expiresAt = addHours(new Date(), OFFER_EXPIRY_HOURS);

  // Status auf OFFERED setzen
  await prisma.waitlistEntry.update({
    where: { id: entry.id },
    data: {
      status: "OFFERED",
      offeredSlotStart: slotStart,
      offeredSlotEnd: slotEnd,
      offeredAt: new Date(),
      expiresAt,
    },
  });

  // SMS senden
  const dateStr = format(slotStart, "dd.MM.yyyy", { locale: de });
  const timeStr = format(slotStart, "HH:mm", { locale: de });
  const confirmUrl = `${BASE_URL}/warteliste/bestaetigen/${entry.token}`;

  await sendWaitlistSms(entry.phone, {
    serviceName: entry.service.name,
    date: dateStr,
    time: timeStr,
    confirmUrl,
    expiryHours: OFFER_EXPIRY_HOURS,
  });

  // Expiry-Job einstellen: nach 2h naechsten benachrichtigen
  await waitlistQueue.add(
    "expire-offer",
    { entryId: entry.id, tenantId, serviceId, locationId, slotStart: slotStart.toISOString(), slotEnd: slotEnd.toISOString() },
    { delay: OFFER_EXPIRY_HOURS * 3600 * 1000, jobId: `expire-${entry.id}` }
  );

  console.log(`[Waitlist] Angebot an ${entry.name} (${entry.phone}) fuer ${dateStr} ${timeStr} gesendet`);
}

// ── SMS Template fuer Warteliste ─────────────────────────────────────────────
async function sendWaitlistSms(
  phone: string,
  opts: { serviceName: string; date: string; time: string; confirmUrl: string; expiryHours: number }
): Promise<void> {
  const body =
    `aitema|Termin: Termin verfuegbar! ` +
    `${opts.serviceName} am ${opts.date} um ${opts.time} Uhr. ` +
    `Bestaetigen (${opts.expiryHours}h): ${opts.confirmUrl}`;

  // Direkt via Sipgate senden (kein Opt-in-Check fuer Warteliste, da explizite Anmeldung)
  const normalizedPhone = normalizePhone(phone);
  if (process.env.SIPGATE_TOKEN_ID && process.env.SIPGATE_TOKEN && process.env.SIPGATE_SMS_ID) {
    try {
      const creds = Buffer.from(process.env.SIPGATE_TOKEN_ID + ':' + process.env.SIPGATE_TOKEN).toString('base64');
      const resp = await fetch('https://api.sipgate.com/v2/sessions/sms', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + creds, 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsId: process.env.SIPGATE_SMS_ID, recipient: normalizedPhone, message: body.slice(0, 160) }),
      });
      if (resp.status !== 204) console.error('[Waitlist] Sipgate error:', resp.status);
    } catch (e) { console.error('[Waitlist] SMS-Fehler:', e); }
  } else {
    console.log('[Waitlist SMS-LOG] An: ' + normalizedPhone + ' | ' + body.slice(0, 80));
  }
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "").replace(/^00/, "+");
  return cleaned.startsWith("+") ? cleaned : "+49" + cleaned.replace(/^0/, "");
}

// ── BullMQ Worker ────────────────────────────────────────────────────────────
export function startWaitlistWorker(): void {
  const worker = new Worker(
    "waitlist-matcher",
    async (job: Job) => {
      if (job.name === "match-slot") {
        const { tenantId, serviceId, locationId, slotStart, slotEnd } = job.data;
        await processWaitlistForSlot(
          tenantId,
          serviceId,
          locationId,
          new Date(slotStart),
          new Date(slotEnd)
        );
      }

      if (job.name === "expire-offer") {
        const { entryId, tenantId, serviceId, locationId, slotStart, slotEnd } = job.data;

        const entry = await prisma.waitlistEntry.findUnique({ where: { id: entryId } });
        if (!entry || entry.status !== "OFFERED") return;

        // Auf EXPIRED setzen
        await prisma.waitlistEntry.update({
          where: { id: entryId },
          data: { status: "EXPIRED" },
        });

        console.log(`[Waitlist] Angebot ${entryId} abgelaufen – naechsten benachrichtigen`);

        // Naechsten auf Warteliste
        await processWaitlistForSlot(
          tenantId,
          serviceId,
          locationId,
          new Date(slotStart),
          new Date(slotEnd)
        );
      }
    },
    {
      connection: { host: process.env.REDIS_HOST || "localhost", port: parseInt(process.env.REDIS_PORT || "6379"), password: process.env.REDIS_PASSWORD },
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Waitlist Worker] Job ${job.id} (${job.name}) abgeschlossen`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Waitlist Worker] Job ${job?.id} fehlgeschlagen:`, err.message);
  });

  console.log("[Waitlist Worker] Gestartet");
}
