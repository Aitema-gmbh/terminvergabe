/**
 * aitema|Termin - QR-Code Service
 *
 * T2: Generiert QR-Codes fuer Termin-Check-in
 * - toDataURL: gibt base64 Data-URL fuer Frontend/E-Mail zurueck
 * - toSVG: gibt SVG-String fuer PDF-Anhang zurueck
 */
import QRCode from 'qrcode';

const QR_OPTIONS: QRCode.QRCodeToDataURLOptions = {
  width: 300,
  margin: 2,
  color: {
    dark: '#0f172a',
    light: '#ffffff',
  },
  errorCorrectionLevel: 'M',
};

/**
 * Erstellt eine base64 Data-URL fuer den QR-Code.
 * Gibt null zurueck bei Fehler (graceful fallback).
 */
export async function generateQrDataUrl(bookingRef: string): Promise<string | null> {
  try {
    const url = `https://termin.aitema.de/checkin/${bookingRef}`;
    return await QRCode.toDataURL(url, QR_OPTIONS);
  } catch (err) {
    console.error('[QR] Fehler beim Generieren des QR-Codes:', err);
    return null;
  }
}

/**
 * Erstellt einen SVG-String fuer den QR-Code (fuer PDF-Nutzung).
 */
export async function generateQrSvg(bookingRef: string): Promise<string | null> {
  try {
    const url = `https://termin.aitema.de/checkin/${bookingRef}`;
    return await QRCode.toString(url, { type: 'svg', margin: 2 });
  } catch (err) {
    console.error('[QR] Fehler beim Generieren des QR-SVG:', err);
    return null;
  }
}
