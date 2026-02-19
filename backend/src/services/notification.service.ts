/**
 * Notification Service
 * 
 * Handles:
 * - Email confirmation after booking
 * - SMS reminders (optional, via external provider)
 * - Email reminders before appointment
 * - Cancellation notifications
 */
import nodemailer from 'nodemailer';

interface NotificationConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
  from: string;
  sms?: {
    provider: string;  // 'sipgate', 'twilio'
    apiKey: string;
    from: string;
  };
}

export class NotificationService {
  private transporter: nodemailer.Transporter;
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }

  /**
   * Send booking confirmation email.
   */
  async sendBookingConfirmation(data: {
    to: string;
    citizenName: string;
    bookingRef: string;
    serviceName: string;
    locationName: string;
    date: string;
    time: string;
    requiredDocs?: string[];
    cancelUrl: string;
  }): Promise<void> {
    const docsHtml = data.requiredDocs?.length
      ? `<h3>Benoetigte Unterlagen:</h3><ul>${data.requiredDocs.map(d => `<li>${d}</li>`).join('')}</ul>`
      : '';

    await this.transporter.sendMail({
      from: this.config.from,
      to: data.to,
      subject: `Terminbestaetigung ${data.bookingRef} - ${data.serviceName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; color: #fff; padding: 1.5rem; border-radius: 0.5rem 0.5rem 0 0;">
            <h1 style="margin: 0; font-size: 1.25rem;">Terminbestaetigung</h1>
          </div>
          <div style="padding: 1.5rem; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 0.5rem 0.5rem;">
            <p>Sehr geehrte/r ${data.citizenName},</p>
            <p>Ihr Termin wurde erfolgreich gebucht.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
              <tr><td style="padding: 0.5rem; color: #6b7280; width: 150px;">Buchungsnr.:</td><td style="padding: 0.5rem; font-weight: 600;">${data.bookingRef}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Dienstleistung:</td><td style="padding: 0.5rem;">${data.serviceName}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Standort:</td><td style="padding: 0.5rem;">${data.locationName}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Datum:</td><td style="padding: 0.5rem; font-weight: 600;">${data.date}</td></tr>
              <tr><td style="padding: 0.5rem; color: #6b7280;">Uhrzeit:</td><td style="padding: 0.5rem; font-weight: 600;">${data.time} Uhr</td></tr>
            </table>
            
            ${docsHtml}
            
            <p style="margin-top: 1.5rem;">
              <a href="${data.cancelUrl}" style="color: #dc2626;">Termin stornieren</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;">
            <p style="font-size: 0.75rem; color: #9ca3af;">
              Diese E-Mail wurde automatisch erstellt. Bitte antworten Sie nicht auf diese Nachricht.
            </p>
          </div>
        </div>
      `,
    });
  }

  /**
   * Send appointment reminder.
   */
  async sendReminder(data: {
    to: string;
    citizenName: string;
    bookingRef: string;
    serviceName: string;
    locationName: string;
    date: string;
    time: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.from,
      to: data.to,
      subject: `Terminerinnerung: ${data.serviceName} am ${data.date}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; color: #fff; padding: 1.5rem; border-radius: 0.5rem 0.5rem 0 0;">
            <h1 style="margin: 0; font-size: 1.25rem;">Terminerinnerung</h1>
          </div>
          <div style="padding: 1.5rem; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 0.5rem 0.5rem;">
            <p>Sehr geehrte/r ${data.citizenName},</p>
            <p>wir moechten Sie an Ihren Termin erinnern:</p>
            <p style="font-size: 1.25rem; font-weight: 700; text-align: center; padding: 1rem; background: #fffbeb; border-radius: 0.5rem;">
              ${data.date} um ${data.time} Uhr
            </p>
            <p><strong>${data.serviceName}</strong> bei <strong>${data.locationName}</strong></p>
            <p>Buchungsnummer: <strong>${data.bookingRef}</strong></p>
          </div>
        </div>
      `,
    });
  }
}
