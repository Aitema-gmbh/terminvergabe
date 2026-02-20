/**
 * aitema|Termin - SMS Gateway Service
 *
 * Adapter-Pattern mit drei Implementierungen:
 * - SipgateSmsAdapter  (produktiv, DSGVO-konform, DE)
 * - TwilioSmsAdapter   (Fallback, international)
 * - LogSmsAdapter      (Dev/Test, kein Versand)
 *
 * Alle SMS-Templates auf max. 160 Zeichen beschraenkt.
 * Opt-in wird per DB-Flag geprueft (smsOptIn).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Typen ───────────────────────────────────────────────────────────────────

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsRateKey {
  phone: string;
  window: number; // Unix-Sekunden (auf Stunde gerundet)
}

// ─── Abstrakte Basisklasse ───────────────────────────────────────────────────

export abstract class SmsGateway {
  protected abstract send(to: string, body: string): Promise<SmsResult>;

  /**
   * Einfaches In-Memory-Rate-Limiting: max. 5 SMS pro Nummer pro Stunde.
   */
  private static rateLimitStore = new Map<string, number>();
  private static readonly MAX_PER_HOUR = 5;

  private isRateLimited(phone: string): boolean {
    const window = Math.floor(Date.now() / 3_600_000);
    const key = `${phone}:${window}`;
    const count = SmsGateway.rateLimitStore.get(key) ?? 0;
    if (count >= SmsGateway.MAX_PER_HOUR) return true;
    SmsGateway.rateLimitStore.set(key, count + 1);
    return false;
  }

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\s+/g, '').replace(/^00/, '+');
    if (!cleaned.startsWith('+')) {
      return '+49' + cleaned.replace(/^0/, '');
    }
    return cleaned;
  }

  private truncate(text: string, max = 160): string {
    return text.length <= max ? text : text.slice(0, max - 1) + '…';
  }

  // ── Opt-in pruefen ──────────────────────────────────────────────────────────

  private async hasSmsOptIn(phone: string): Promise<boolean> {
    try {
      const citizen = await prisma.citizen.findFirst({
        where: { phone: phone },
        select: { smsOptIn: true },
      });
      // Kein Datensatz → Opt-in unbekannt → ablehnen
      return citizen?.smsOptIn ?? false;
    } catch {
      // Fallback: wenn DB-Feld nicht existiert, erlauben (legacy)
      return true;
    }
  }

  // ── Öffentliche Template-Methoden ───────────────────────────────────────────

  async sendBookingConfirmation(
    phone: string,
    bookingRef: string,
    date: string,
    time: string,
    service: string,
    location: string,
  ): Promise<SmsResult> {
    const normalized = this.normalizePhone(phone);
    if (this.isRateLimited(normalized)) {
      return { success: false, error: 'rate_limited' };
    }
    if (!(await this.hasSmsOptIn(normalized))) {
      return { success: false, error: 'no_opt_in' };
    }
    const body = this.truncate(
      `Ihr Termin ${bookingRef} ist bestaetigt: ` +
      `${service} am ${date} um ${time} Uhr, ${location}. ` +
      `aitema|Termin`,
    );
    return this.send(normalized, body);
  }

  async sendBookingReminder(
    phone: string,
    bookingRef: string,
    date: string,
    time: string,
  ): Promise<SmsResult> {
    const normalized = this.normalizePhone(phone);
    if (this.isRateLimited(normalized)) {
      return { success: false, error: 'rate_limited' };
    }
    if (!(await this.hasSmsOptIn(normalized))) {
      return { success: false, error: 'no_opt_in' };
    }
    const body = this.truncate(
      `Erinnerung: Termin ${bookingRef} am ${date} um ${time} Uhr. ` +
      `Bitte bringen Sie alle erforderlichen Unterlagen mit.`,
    );
    return this.send(normalized, body);
  }

  async sendQueueNotification(
    phone: string,
    ticketNr: string,
    estimatedWait: number,
  ): Promise<SmsResult> {
    const normalized = this.normalizePhone(phone);
    if (this.isRateLimited(normalized)) {
      return { success: false, error: 'rate_limited' };
    }
    if (!(await this.hasSmsOptIn(normalized))) {
      return { success: false, error: 'no_opt_in' };
    }
    const body = this.truncate(
      `Ticket ${ticketNr}: Ca. ${estimatedWait} Min. Wartezeit. ` +
      `Bitte begeben Sie sich zum Wartebereich.`,
    );
    return this.send(normalized, body);
  }

  async sendCancellationConfirm(
    phone: string,
    bookingRef: string,
  ): Promise<SmsResult> {
    const normalized = this.normalizePhone(phone);
    if (this.isRateLimited(normalized)) {
      return { success: false, error: 'rate_limited' };
    }
    if (!(await this.hasSmsOptIn(normalized))) {
      return { success: false, error: 'no_opt_in' };
    }
    const body = this.truncate(
      `Termin ${bookingRef} wurde erfolgreich storniert. ` +
      `Bei Fragen: www.aitema.de`,
    );
    return this.send(normalized, body);
  }
}

// ─── Sipgate-Adapter (produktiv, DSGVO DE) ───────────────────────────────────

export class SipgateSmsAdapter extends SmsGateway {
  private readonly apiUrl = 'https://api.sipgate.com/v2/sessions/sms';

  constructor(
    private readonly tokenId: string,
    private readonly token: string,
    private readonly smsId: string,
  ) {
    super();
  }

  protected async send(to: string, body: string): Promise<SmsResult> {
    const credentials = Buffer.from(`${this.tokenId}:${this.token}`).toString('base64');

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        smsId: this.smsId,
        recipient: to,
        message: body,
      }),
    });

    if (response.status === 204) {
      return { success: true };
    }

    const text = await response.text();
    return {
      success: false,
      error: `sipgate_error_${response.status}: ${text.slice(0, 200)}`,
    };
  }
}

// ─── Twilio-Adapter (Fallback) ────────────────────────────────────────────────

export class TwilioSmsAdapter extends SmsGateway {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string,
  ) {
    super();
  }

  protected async send(to: string, body: string): Promise<SmsResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const params = new URLSearchParams({
      To: to,
      From: this.fromNumber,
      Body: body,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const json = await response.json() as { sid?: string; message?: string; code?: number };

    if (response.ok && json.sid) {
      return { success: true, messageId: json.sid };
    }

    return {
      success: false,
      error: `twilio_error_${response.status}: ${json.message ?? 'unknown'}`,
    };
  }
}

// ─── Log-Adapter (Dev/Test) ───────────────────────────────────────────────────

export class LogSmsAdapter extends SmsGateway {
  protected async send(to: string, body: string): Promise<SmsResult> {
    console.log(
      `[SMS-LOG] An: ${to} | Zeichen: ${body.length} | Inhalt: "${body}"`,
    );
    return { success: true, messageId: `log_${Date.now()}` };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createSmsGateway(): SmsGateway {
  const env = process.env;

  if (env.SIPGATE_TOKEN_ID && env.SIPGATE_TOKEN && env.SIPGATE_SMS_ID) {
    return new SipgateSmsAdapter(
      env.SIPGATE_TOKEN_ID,
      env.SIPGATE_TOKEN,
      env.SIPGATE_SMS_ID,
    );
  }

  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER) {
    return new TwilioSmsAdapter(
      env.TWILIO_ACCOUNT_SID,
      env.TWILIO_AUTH_TOKEN,
      env.TWILIO_FROM_NUMBER,
    );
  }

  console.warn('[SMS] Kein Gateway konfiguriert – LogSmsAdapter aktiv');
  return new LogSmsAdapter();
}

export const smsGateway = createSmsGateway();
