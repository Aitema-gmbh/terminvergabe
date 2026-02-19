import nodemailer from "nodemailer";
import { getConfig } from "../../config.js";
import { prisma } from "../../server.js";

const config = getConfig();

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_PORT === 465,
  auth:
    config.SMTP_USER && config.SMTP_PASS
      ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
      : undefined,
});

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send an email notification.
 */
export async function sendEmail(data: EmailData): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: config.SMTP_FROM,
      to: data.to,
      subject: data.subject,
      html: data.html,
      text: data.text,
    });
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

/**
 * Generate booking confirmation email.
 */
export function generateBookingConfirmationEmail(data: {
  citizenName: string;
  serviceName: string;
  locationName: string;
  locationAddress: string;
  scheduledStart: string;
  scheduledEnd: string;
  bookingCode: string;
  requiredDocuments: string[];
  fee: number | null;
}): EmailData {
  const startDate = new Date(data.scheduledStart);
  const dateStr = startDate.toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = startDate.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endDate = new Date(data.scheduledEnd);
  const endTimeStr = endDate.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const documentsSection =
    data.requiredDocuments.length > 0
      ? `
    <h3>Bitte bringen Sie folgende Unterlagen mit:</h3>
    <ul>
      ${data.requiredDocuments.map((d) => `<li>${d}</li>`).join("")}
    </ul>`
      : "";

  const feeSection =
    data.fee != null ? `<p><strong>Gebuehr:</strong> ${data.fee.toFixed(2)} EUR</p>` : "";

  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #003366; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Terminbestaetigung</h1>
      </div>
      <div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Sehr geehrte/r ${data.citizenName},</p>
        <p>Ihr Termin wurde erfolgreich gebucht.</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Dienstleistung:</strong> ${data.serviceName}</p>
          <p><strong>Datum:</strong> ${dateStr}</p>
          <p><strong>Uhrzeit:</strong> ${timeStr} - ${endTimeStr}</p>
          <p><strong>Ort:</strong> ${data.locationName}</p>
          <p><strong>Adresse:</strong> ${data.locationAddress}</p>
          ${feeSection}
        </div>

        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px;">Ihr Buchungscode:</p>
          <p style="margin: 5px 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">${data.bookingCode}</p>
          <p style="margin: 0; font-size: 12px; color: #666;">Bitte bewahren Sie diesen Code auf.</p>
        </div>

        ${documentsSection}

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          Sie koennen Ihren Termin jederzeit unter Angabe des Buchungscodes stornieren.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Terminbestaetigung

Sehr geehrte/r ${data.citizenName},

Ihr Termin wurde erfolgreich gebucht.

Dienstleistung: ${data.serviceName}
Datum: ${dateStr}
Uhrzeit: ${timeStr} - ${endTimeStr}
Ort: ${data.locationName}
Adresse: ${data.locationAddress}
${data.fee != null ? `Gebuehr: ${data.fee.toFixed(2)} EUR` : ""}

Buchungscode: ${data.bookingCode}

${data.requiredDocuments.length > 0 ? `Bitte bringen Sie mit: ${data.requiredDocuments.join(", ")}` : ""}`;

  return {
    to: "",
    subject: `Terminbestaetigung: ${data.serviceName} am ${dateStr}`,
    html,
    text,
  };
}

/**
 * Generate cancellation email.
 */
export function generateCancellationEmail(data: {
  citizenName: string;
  serviceName: string;
  locationName: string;
  bookingCode: string;
}): EmailData {
  const html = `
    <!DOCTYPE html>
    <html lang="de">
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #cc0000; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">Termin storniert</h1>
      </div>
      <div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p>Sehr geehrte/r ${data.citizenName},</p>
        <p>Ihr Termin fuer <strong>${data.serviceName}</strong> bei <strong>${data.locationName}</strong>
           (Buchungscode: ${data.bookingCode}) wurde storniert.</p>
        <p>Sie koennen jederzeit einen neuen Termin buchen.</p>
      </div>
    </body>
    </html>
  `;

  return {
    to: "",
    subject: `Termin storniert: ${data.serviceName} (${data.bookingCode})`,
    html,
    text: `Termin storniert\n\nSehr geehrte/r ${data.citizenName},\n\nIhr Termin fuer ${data.serviceName} bei ${data.locationName} (${data.bookingCode}) wurde storniert.`,
  };
}

/**
 * Log a notification in the database.
 */
export async function logNotification(
  tenantId: string,
  type: string,
  channel: string,
  recipient: string,
  subject: string,
  body: string,
  status: "SENT" | "FAILED",
  referenceType?: string,
  referenceId?: string,
  error?: string
) {
  await prisma.notification.create({
    data: {
      tenantId,
      type: type as any,
      channel: channel as any,
      recipient,
      subject,
      body,
      status: status as any,
      referenceType,
      referenceId,
      sentAt: status === "SENT" ? new Date() : null,
      error,
    },
  });
}
