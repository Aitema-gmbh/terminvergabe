/**
 * aitema|Termin - Web Push Service
 *
 * Verwaltet VAPID-Schluessel, Subscription-Storage (Redis)
 * und den Versand von Push-Nachrichten mit Retry-Logik (max. 3).
 *
 * Abhaengigkeiten:
 *   npm install web-push
 *   npm install -D @types/web-push
 */

import webpush, { PushSubscription, SendResult } from 'web-push';
import { createClient } from 'ioredis';

// ─── Typen ───────────────────────────────────────────────────────────────────

export interface StoredSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  bookingRef: string;
  createdAt: string;
}

export interface QueueUpdatePayload {
  position: number;
  estimatedWait: number; // Minuten
}

export interface NowServingPayload {
  schalter: string;
  raum?: string;
}

export interface PushPayload {
  type: 'queue_update' | 'now_serving' | 'reminder_24h' | 'reminder_1h';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: string;
  icon?: string;
}

// ─── PushService ─────────────────────────────────────────────────────────────

export class PushService {
  private redis: ReturnType<typeof createClient>;
  private readonly KEY_PREFIX = 'push:sub:';
  private readonly BOOKING_KEY_PREFIX = 'push:booking:';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 2_000;

  constructor() {
    this.redis = new createClient(process.env.REDIS_URL ?? 'redis://localhost:6379');

    // VAPID-Schluessel aus ENV setzen
    const subject = process.env.VAPID_SUBJECT ?? 'mailto:termin@aitema.de';
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
    const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';

    if (!publicKey || !privateKey) {
      console.warn(
        '[Push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY nicht gesetzt. ' +
        'Schluessel generieren: npx web-push generate-vapid-keys',
      );
    } else {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  // ── Subscription-Verwaltung ─────────────────────────────────────────────────

  /**
   * Speichert eine Push-Subscription und verknuepft sie mit einer Buchungsreferenz.
   */
  async subscribe(
    endpoint: string,
    keys: { p256dh: string; auth: string },
    bookingRef: string,
  ): Promise<void> {
    const sub: StoredSubscription = {
      endpoint,
      keys,
      bookingRef,
      createdAt: new Date().toISOString(),
    };

    const endpointHash = Buffer.from(endpoint).toString('base64url').slice(0, 32);

    // endpoint → subscription JSON
    await this.redis.set(
      `${this.KEY_PREFIX}${endpointHash}`,
      JSON.stringify(sub),
      'EX',
      60 * 60 * 24 * 90, // 90 Tage TTL
    );

    // bookingRef → Liste von endpoint-Hashes
    await this.redis.sadd(`${this.BOOKING_KEY_PREFIX}${bookingRef}`, endpointHash);
  }

  /**
   * Entfernt eine Push-Subscription anhand des Endpoints.
   */
  async unsubscribe(endpoint: string): Promise<void> {
    const endpointHash = Buffer.from(endpoint).toString('base64url').slice(0, 32);
    const raw = await this.redis.get(`${this.KEY_PREFIX}${endpointHash}`);

    if (raw) {
      const sub: StoredSubscription = JSON.parse(raw);
      await this.redis.srem(`${this.BOOKING_KEY_PREFIX}${sub.bookingRef}`, endpointHash);
    }

    await this.redis.del(`${this.KEY_PREFIX}${endpointHash}`);
  }

  /**
   * Laedt alle Subscriptions fuer eine Buchungsreferenz.
   */
  private async getSubscriptionsForBooking(
    bookingRef: string,
  ): Promise<StoredSubscription[]> {
    const hashes = await this.redis.smembers(`${this.BOOKING_KEY_PREFIX}${bookingRef}`);
    const subs: StoredSubscription[] = [];

    for (const hash of hashes) {
      const raw = await this.redis.get(`${this.KEY_PREFIX}${hash}`);
      if (raw) subs.push(JSON.parse(raw));
    }

    return subs;
  }

  // ── Sende-Logik ─────────────────────────────────────────────────────────────

  private async sendWithRetry(
    sub: StoredSubscription,
    payload: PushPayload,
    attempt = 1,
  ): Promise<void> {
    const pushSub: PushSubscription = {
      endpoint: sub.endpoint,
      keys: sub.keys,
    };

    try {
      await webpush.sendNotification(pushSub, JSON.stringify(payload));
    } catch (err: any) {
      // 410 Gone = Subscription ungueltig, aus DB loeschen
      if (err?.statusCode === 410) {
        console.log(`[Push] Subscription ${sub.endpoint.slice(-20)} abgelaufen, entferne.`);
        await this.unsubscribe(sub.endpoint);
        return;
      }

      if (attempt < this.MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, this.RETRY_DELAY_MS * attempt));
        return this.sendWithRetry(sub, payload, attempt + 1);
      }

      console.error(
        `[Push] Fehlgeschlagen nach ${this.MAX_RETRIES} Versuchen:`,
        err?.message,
      );
    }
  }

  private async broadcast(
    bookingRef: string,
    payload: PushPayload,
  ): Promise<void> {
    const subs = await this.getSubscriptionsForBooking(bookingRef);
    await Promise.allSettled(subs.map((s) => this.sendWithRetry(s, payload)));
  }

  // ── Öffentliche Methoden ────────────────────────────────────────────────────

  /**
   * Sendet Warteschlangen-Update: aktuelle Position + geschaetzte Wartezeit.
   */
  async sendQueueUpdate(
    bookingRef: string,
    { position, estimatedWait }: QueueUpdatePayload,
  ): Promise<void> {
    await this.broadcast(bookingRef, {
      type: 'queue_update',
      title: 'Warteschlangen-Update',
      body:
        position === 1
          ? 'Sie sind der Naechste. Bitte halten Sie sich bereit.'
          : `Sie sind auf Position ${position}. Ca. ${estimatedWait} Min. Wartezeit.`,
      data: { bookingRef, position, estimatedWait },
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
    });
  }

  /**
   * Benachrichtigung: "Jetzt dran" – mit Schalter und optionalem Raum.
   */
  async sendNowServing(
    bookingRef: string,
    { schalter, raum }: NowServingPayload,
  ): Promise<void> {
    const location = raum ? `${schalter} (${raum})` : schalter;
    await this.broadcast(bookingRef, {
      type: 'now_serving',
      title: 'Bitte kommen Sie vor!',
      body: `Begeben Sie sich bitte zu ${location}.`,
      data: { bookingRef, schalter, raum },
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
    });
  }

  /**
   * Terminerinnerung 24 Stunden vorher.
   */
  async sendReminder24h(
    bookingRef: string,
    date: string,
    time: string,
    service: string,
  ): Promise<void> {
    await this.broadcast(bookingRef, {
      type: 'reminder_24h',
      title: 'Terminerinnerung morgen',
      body: `${service} morgen um ${time} Uhr. Buchung: ${bookingRef}`,
      data: { bookingRef, date, time },
      icon: '/icons/icon-192.png',
    });
  }

  /**
   * Terminerinnerung 1 Stunde vorher.
   */
  async sendReminder1h(
    bookingRef: string,
    time: string,
    service: string,
  ): Promise<void> {
    await this.broadcast(bookingRef, {
      type: 'reminder_1h',
      title: 'Termin in 1 Stunde',
      body: `${service} heute um ${time} Uhr. Bitte puenktlich erscheinen.`,
      data: { bookingRef, time },
      icon: '/icons/icon-192.png',
    });
  }
}

export const pushService = new PushService();
