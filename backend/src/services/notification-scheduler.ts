/**
 * aitema|Termin - Notification Scheduler
 *
 * BullMQ-basierte Cron-Jobs:
 *   - Terminerinnerung 24h vorher  (taeglicher Scan, SMS + Push)
 *   - Terminerinnerung 1h vorher   (stündlicher Scan, Push)
 *   - Queue-Update alle 5 Minuten  (Push fuer aktive Warteschlangen)
 *
 * Abhaengigkeit: npm install bullmq
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

import { smsGateway } from './sms.service.js';
import { pushService } from './push.service.js';
import { calculateNoShowRisk, getRiskLevel } from './noshow-risk.service.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Europe/Berlin';
const prisma = new PrismaClient();

// ─── Redis-Verbindung ─────────────────────────────────────────────────────────

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // BullMQ-Anforderung
});

// ─── Queues ───────────────────────────────────────────────────────────────────

const reminderQueue = new Queue('notification:reminders', { connection });
const queueUpdateQueue = new Queue('notification:queue-updates', { connection });

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

async function formatDate(date: Date): Promise<string> {
  return dayjs(date).tz(TZ).format('DD.MM.YYYY');
}

async function formatTime(date: Date): Promise<string> {
  return dayjs(date).tz(TZ).format('HH:mm');
}

// ─── Job-Definitionen ─────────────────────────────────────────────────────────

/**
 * Scannt Buchungen, die in 24h stattfinden, und verschickt Erinnerungen.
 */
async function processReminder24h(): Promise<void> {
  const now = dayjs().tz(TZ);
  const windowStart = now.add(23, 'hour').add(45, 'minute').toDate();
  const windowEnd = now.add(24, 'hour').add(15, 'minute').toDate();

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledStart: { gte: windowStart, lte: windowEnd },
      status: AppointmentStatus.CONFIRMED,
      reminder24hSent: false,
    },
    select: {
      bookingCode: true,
      scheduledStart: true,
      citizenPhone: true,
      smsOptIn: true,
      service: { select: { name: true } },
    },
  });

  console.log(`[Scheduler] 24h-Erinnerung: ${appointments.length} Termine gefunden`);

  for (const appt of appointments) {
    const date = await formatDate(appt.scheduledStart);
    const time = await formatTime(appt.scheduledStart);

    // SMS
    if (appt.citizenPhone && appt.smsOptIn) {
      await smsGateway.sendBookingReminder(
        appt.citizenPhone,
        appt.bookingCode,
        date,
        time,
      ).catch((e) => console.error('[Scheduler] SMS-Fehler:', e));
    }

    // Push
    await pushService.sendReminder24h(
      appt.bookingCode,
      date,
      time,
      appt.service.name,
    ).catch((e) => console.error('[Scheduler] Push-Fehler:', e));

    // Als gesendet markieren
    await prisma.appointment.update({
      where: { bookingCode: appt.bookingCode },
      data: { reminder24hSent: true },
    }).catch(() => {});
  }
}

/**
 * Scannt Buchungen, die in 1h stattfinden, und verschickt Push-Erinnerungen.
 */
async function processReminder1h(): Promise<void> {
  const now = dayjs().tz(TZ);
  const windowStart = now.add(55, 'minute').toDate();
  const windowEnd = now.add(65, 'minute').toDate();

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledStart: { gte: windowStart, lte: windowEnd },
      status: AppointmentStatus.CONFIRMED,
      reminder1hSent: false,
    },
    select: {
      bookingCode: true,
      scheduledStart: true,
      service: { select: { name: true } },
    },
  });

  console.log(`[Scheduler] 1h-Erinnerung: ${appointments.length} Termine gefunden`);

  for (const appt of appointments) {
    const time = await formatTime(appt.scheduledStart);

    await pushService.sendReminder1h(
      appt.bookingCode,
      time,
      appt.service.name,
    ).catch((e) => console.error('[Scheduler] Push-Fehler:', e));

    await prisma.appointment.update({
      where: { bookingCode: appt.bookingCode },
      data: { reminder1hSent: true },
    }).catch(() => {});
  }
}


/**
 * Taeglich um 07:00: Extra-SMS fuer High-Risk Termine (Score > 70).
 */
async function sendHighRiskReminders(): Promise<void> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayStart = new Date(tomorrow);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(tomorrow);
  dayEnd.setHours(23, 59, 59, 999);

  const bookings = await prisma.appointment.findMany({
    where: {
      startTime: { gte: dayStart, lte: dayEnd },
      status: AppointmentStatus.CONFIRMED,
    },
    select: {
      id: true,
      bookingRef: true,
      startTime: true,
      createdAt: true,
      citizenPhone: true,
      citizenEmail: true,
      service: { select: { name: true } },
    },
  });

  console.log(`[Scheduler] High-Risk-Check: ${bookings.length} Termine fuer morgen`);

  for (const booking of bookings) {
    const apptDate = booking.startTime;
    const created = booking.createdAt;

    const factors = {
      bookingLeadDays: Math.floor(
        (apptDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      ),
      appointmentHour: apptDate.getHours(),
      appointmentDayOfWeek: apptDate.getDay(),
      hasPhone: !!booking.citizenPhone,
      isFirstBooking: false,
      bookingLeadMinutes: Math.floor(
        (apptDate.getTime() - now.getTime()) / (1000 * 60)
      ),
    };

    const score = calculateNoShowRisk(factors);
    const level = getRiskLevel(score);

    if (score > 70) {
      console.log(`[Scheduler] High-Risk Extra-Reminder: ${booking.bookingRef} (Score: ${score}, Level: ${level})`);

      if (booking.citizenPhone) {
        const date = dayjs(apptDate).tz(TZ).format('DD.MM.YYYY');
        const time = dayjs(apptDate).tz(TZ).format('HH:mm');

        await smsGateway.sendBookingReminder(
          booking.citizenPhone,
          booking.bookingRef,
          date,
          time,
        ).catch((e: Error) => console.error('[Scheduler] High-Risk SMS-Fehler:', e));
      }
    }
  }
}

/**
 * Sendet Queue-Updates fuer alle aktiven Warteschlangen-Tickets.
 */
async function processQueueUpdates(): Promise<void> {
  const activeQueues = await prisma.queueEntry.findMany({
    where: {
      status: { in: ['WAITING', 'CALLED'] },
    },
    select: {
      id: true,
      ticketNumber: true,
      position: true,
      estimatedWaitMinutes: true,
      appointment: {
        select: {
          bookingCode: true,
          citizenPhone: true,
          smsOptIn: true,
        },
      },
    },
    orderBy: { position: 'asc' },
    take: 200, // Sicherheitslimit
  });

  for (const entry of activeQueues) {
    if (!entry.appointment) continue;

    const { bookingCode } = entry.appointment;
    const estimatedWait = entry.estimatedWaitMinutes ?? 5;
    const position = entry.position ?? 1;

    // Push-Update
    await pushService.sendQueueUpdate(bookingCode, {
      position,
      estimatedWait,
    }).catch(() => {});

    // SMS nur bei Position <= 3 (um Spam zu vermeiden)
    if (
      position <= 3 &&
      entry.appointment.citizenPhone &&
      entry.appointment.smsOptIn
    ) {
      await smsGateway.sendQueueNotification(
        entry.appointment.citizenPhone,
        String(entry.ticketNumber),
        estimatedWait,
      ).catch(() => {});
    }
  }
}

// ─── Worker ───────────────────────────────────────────────────────────────────

const reminderWorker = new Worker(
  'notification:reminders',
  async (job: Job) => {
    switch (job.name) {
      case 'reminder-24h':
        await processReminder24h();
        break;
      case 'reminder-1h':
        await processReminder1h();
        break;
      case 'high-risk-reminder':
        await sendHighRiskReminders();
        break;
      default:
        console.warn(`[Scheduler] Unbekannter Job: ${job.name}`);
    }
  },
  { connection },
);

const queueUpdateWorker = new Worker(
  'notification:queue-updates',
  async () => {
    await processQueueUpdates();
  },
  { connection },
);

reminderWorker.on('failed', (job, err) => {
  console.error(`[Scheduler] Job ${job?.name} fehlgeschlagen:`, err.message);
});

queueUpdateWorker.on('failed', (job, err) => {
  console.error(`[Scheduler] Queue-Update fehlgeschlagen:`, err.message);
});

// ─── Cron-Jobs registrieren ───────────────────────────────────────────────────

export async function startNotificationScheduler(): Promise<void> {
  // Terminerinnerung 24h – taeglicher Check um 08:00 Uhr
  await reminderQueue.add(
    'reminder-24h',
    {},
    {
      repeat: { pattern: '0 8 * * *', tz: TZ },
      removeOnComplete: 50,
      removeOnFail: 20,
    },
  );

  // Terminerinnerung 1h – stündlicher Check
  await reminderQueue.add(
    'reminder-1h',
    {},
    {
      repeat: { pattern: '0 * * * *', tz: TZ },
      removeOnComplete: 50,
      removeOnFail: 20,
    },
  );

  // Queue-Update alle 5 Minuten
  await queueUpdateQueue.add(
    'queue-update',
    {},
    {
      repeat: { pattern: '*/5 * * * *' },
      removeOnComplete: 20,
      removeOnFail: 10,
    },
  );

  // High-Risk Extra-Reminder - taeglich um 07:00
  await reminderQueue.add(
    'high-risk-reminder',
    {},
    {
      repeat: { pattern: '0 7 * * *', tz: TZ },
      removeOnComplete: 50,
      removeOnFail: 20,
    },
  );

  console.log('[Scheduler] Notification-Scheduler gestartet.');
  console.log('  - reminder-24h: taeglicher Check 08:00 Uhr');
  console.log('  - reminder-1h:  stündlicher Check');
  console.log('  - high-risk-reminder: taeglich 07:00 Uhr');
  console.log('  - queue-update: alle 5 Minuten');
}

export async function stopNotificationScheduler(): Promise<void> {
  await reminderWorker.close();
  await queueUpdateWorker.close();
  await reminderQueue.close();
  await queueUpdateQueue.close();
  console.log('[Scheduler] Notification-Scheduler gestoppt.');
}
