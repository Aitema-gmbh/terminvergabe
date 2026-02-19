/**
 * aitema|Termin - PDF / HTML Generation Service
 *
 * Generates HTML strings for booking confirmations and queue tickets.
 * HTML can be served directly or converted to PDF via a headless browser.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppointmentData {
  bookingRef: string;
  date: string;          // ISO date string
  time: string;          // e.g. "09:30"
  locationName: string;
  locationAddress: string;
  serviceName: string;
  citizenName: string;
  requiredDocuments?: string[];
  qrCodeDataUrl?: string;
  cancellationDeadline?: string;
  accessibility?: {
    wheelchairAccessible?: boolean;
    elevator?: boolean;
    signLanguage?: boolean;
    inductionLoop?: boolean;
  };
}

export interface QueueEntryData {
  ticketId: string;
  ticketNumber: string;
  estimatedWait: number;   // minutes
  locationName: string;
  locationAddress: string;
  serviceName: string;
  citizenName?: string;
  issuedAt: string;        // ISO datetime
}

// ---------------------------------------------------------------------------
// Common Styles
// ---------------------------------------------------------------------------

const COMMON_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a1a;
    line-height: 1.5;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #003366;
    padding-bottom: 16px;
    margin-bottom: 32px;
  }
  .logo-placeholder {
    width: 180px;
    height: 60px;
    background: #003366;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    border-radius: 4px;
  }
  h1 {
    font-size: 24px;
    color: #003366;
    margin-bottom: 24px;
  }
  h2 {
    font-size: 18px;
    color: #003366;
    margin-top: 24px;
    margin-bottom: 12px;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 8px 16px;
    margin-bottom: 24px;
  }
  .info-label {
    font-weight: 600;
    color: #555;
  }
  .info-value {
    color: #1a1a1a;
  }
  .ref-badge {
    display: inline-block;
    background: #e8f0fe;
    color: #003366;
    padding: 4px 12px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 1px;
  }
  .documents-list {
    list-style: none;
    padding: 0;
  }
  .documents-list li {
    padding: 6px 0 6px 24px;
    position: relative;
  }
  .documents-list li::before {
    content: "\\2713";
    position: absolute;
    left: 0;
    color: #003366;
    font-weight: 700;
  }
  .qr-section {
    text-align: center;
    margin: 24px 0;
  }
  .qr-section img {
    width: 160px;
    height: 160px;
    border: 1px solid #ddd;
    padding: 8px;
  }
  .notice {
    background: #fff3cd;
    border-left: 4px solid #ffc107;
    padding: 12px 16px;
    margin: 16px 0;
    font-size: 14px;
  }
  .a11y-info {
    background: #e8f5e9;
    border-left: 4px solid #4caf50;
    padding: 12px 16px;
    margin: 16px 0;
    font-size: 14px;
  }
  .a11y-info ul {
    list-style: none;
    padding: 0;
    margin-top: 8px;
  }
  .a11y-info li {
    padding: 2px 0;
  }
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #ddd;
    font-size: 12px;
    color: #888;
    text-align: center;
  }
  .ticket-number {
    font-size: 96px;
    font-weight: 800;
    color: #003366;
    text-align: center;
    padding: 32px 0;
    letter-spacing: 4px;
  }
  .wait-time {
    text-align: center;
    font-size: 24px;
    color: #555;
    margin-bottom: 32px;
  }
  .wait-time strong {
    color: #003366;
    font-size: 32px;
  }
  @media print {
    body { padding: 20px; }
    .no-print { display: none; }
  }
`;

// ---------------------------------------------------------------------------
// Booking Confirmation
// ---------------------------------------------------------------------------

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function formatTime(isoDatetime: string): string {
  try {
    const d = new Date(isoDatetime);
    return d.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDatetime;
  }
}

export function generateBookingConfirmation(appointment: AppointmentData): string {
  const {
    bookingRef,
    date,
    time,
    locationName,
    locationAddress,
    serviceName,
    citizenName,
    requiredDocuments = [],
    qrCodeDataUrl,
    cancellationDeadline,
    accessibility,
  } = appointment;

  const documentsHtml =
    requiredDocuments.length > 0
      ? `
        <h2>Mitzubringende Unterlagen</h2>
        <ul class="documents-list">
          ${requiredDocuments.map((doc) => `<li>${escapeHtml(doc)}</li>`).join("")}
        </ul>`
      : "";

  const qrHtml = qrCodeDataUrl
    ? `
      <div class="qr-section">
        <img src="${escapeHtml(qrCodeDataUrl)}" alt="QR-Code zur Terminbestätigung" />
        <p style="font-size: 12px; color: #888; margin-top: 4px;">
          QR-Code beim Einchecken vorzeigen
        </p>
      </div>`
    : `
      <div class="qr-section">
        <div style="width:160px;height:160px;border:2px dashed #ccc;display:inline-flex;align-items:center;justify-content:center;color:#999;font-size:12px;">
          QR-Code
        </div>
      </div>`;

  const cancellationHtml = cancellationDeadline
    ? `
      <div class="notice">
        <strong>Stornierung:</strong> Kostenfreie Stornierung bis ${escapeHtml(cancellationDeadline)} möglich.
        Nutzen Sie dazu Ihre Referenznummer oder den Link in der Bestätigungs-E-Mail.
      </div>`
    : `
      <div class="notice">
        <strong>Stornierung:</strong> Bitte stornieren Sie den Termin rechtzeitig,
        falls Sie verhindert sind. Nutzen Sie dazu Ihre Referenznummer.
      </div>`;

  const a11yFeatures: string[] = [];
  if (accessibility?.wheelchairAccessible) a11yFeatures.push("Rollstuhlgerecht");
  if (accessibility?.elevator) a11yFeatures.push("Aufzug vorhanden");
  if (accessibility?.signLanguage) a11yFeatures.push("Gebärdensprache auf Anfrage");
  if (accessibility?.inductionLoop) a11yFeatures.push("Induktionsschleife vorhanden");

  const a11yHtml =
    a11yFeatures.length > 0
      ? `
        <div class="a11y-info">
          <strong>Barrierefreiheit am Standort:</strong>
          <ul>
            ${a11yFeatures.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
          </ul>
        </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Terminbestätigung – ${escapeHtml(bookingRef)}</title>
  <style>${COMMON_STYLES}</style>
</head>
<body>
  <div class="header">
    <div class="logo-placeholder">aitema|Termin</div>
    <span style="font-size:12px;color:#888;">Ref: ${escapeHtml(bookingRef)}</span>
  </div>

  <h1>Terminbestätigung</h1>

  <div class="info-grid">
    <span class="info-label">Referenznummer</span>
    <span class="info-value"><span class="ref-badge">${escapeHtml(bookingRef)}</span></span>

    <span class="info-label">Name</span>
    <span class="info-value">${escapeHtml(citizenName)}</span>

    <span class="info-label">Datum</span>
    <span class="info-value">${escapeHtml(formatDate(date))}</span>

    <span class="info-label">Uhrzeit</span>
    <span class="info-value">${escapeHtml(time)} Uhr</span>

    <span class="info-label">Standort</span>
    <span class="info-value">${escapeHtml(locationName)}<br/><small>${escapeHtml(locationAddress)}</small></span>

    <span class="info-label">Dienstleistung</span>
    <span class="info-value">${escapeHtml(serviceName)}</span>
  </div>

  ${documentsHtml}
  ${qrHtml}
  ${cancellationHtml}
  ${a11yHtml}

  <div class="footer">
    aitema|Termin &mdash; Digitale Terminvergabe<br/>
    Dieses Dokument wurde automatisch erstellt.
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Queue Ticket
// ---------------------------------------------------------------------------

export function generateQueueTicket(entry: QueueEntryData): string {
  const {
    ticketNumber,
    estimatedWait,
    locationName,
    locationAddress,
    serviceName,
    citizenName,
    issuedAt,
  } = entry;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wartenummer ${escapeHtml(ticketNumber)}</title>
  <style>${COMMON_STYLES}</style>
</head>
<body>
  <div class="header">
    <div class="logo-placeholder">aitema|Termin</div>
    <span style="font-size:12px;color:#888;">Wartenummer</span>
  </div>

  <h1 style="text-align:center;">Ihre Wartenummer</h1>
  <div class="ticket-number" aria-label="Wartenummer ${escapeHtml(ticketNumber)}">
    ${escapeHtml(ticketNumber)}
  </div>

  <div class="wait-time">
    Geschätzte Wartezeit: <strong>~${estimatedWait}</strong> Minuten
  </div>

  <div class="info-grid">
    <span class="info-label">Standort</span>
    <span class="info-value">${escapeHtml(locationName)}<br/><small>${escapeHtml(locationAddress)}</small></span>

    <span class="info-label">Dienstleistung</span>
    <span class="info-value">${escapeHtml(serviceName)}</span>

    ${citizenName ? `
    <span class="info-label">Name</span>
    <span class="info-value">${escapeHtml(citizenName)}</span>
    ` : ""}

    <span class="info-label">Ausgabezeit</span>
    <span class="info-value">${escapeHtml(formatTime(issuedAt))}</span>
  </div>

  <div class="notice">
    <strong>Hinweis:</strong> Bitte warten Sie im Wartebereich, bis Ihre Nummer aufgerufen wird.
    Achten Sie auf die Anzeige und akustische Durchsagen.
  </div>

  <div class="footer">
    aitema|Termin &mdash; Digitale Terminvergabe<br/>
    Dieses Ticket wurde automatisch erstellt.
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const pdfService = {
  generateBookingConfirmation,
  generateQueueTicket,
};
