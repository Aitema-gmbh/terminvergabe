/**
 * Heuristik-basiertes No-Show-Risiko-Scoring (0-100).
 * Keine ML noetig - regelbasiert auf historischen Mustern.
 */

interface BookingRiskFactors {
  bookingLeadDays: number;       // Tage zwischen Buchung und Termin
  appointmentHour: number;       // Stunde des Termins (0-23)
  appointmentDayOfWeek: number;  // 0=So, 1=Mo, ..., 6=Sa
  hasPhone: boolean;             // Telefonnummer hinterlegt?
  isFirstBooking: boolean;       // Erste Buchung des Buergers?
  bookingLeadMinutes: number;    // Minuten zwischen jetzt und Termin
  serviceType?: string;          // Art der Dienstleistung
}

export function calculateNoShowRisk(factors: BookingRiskFactors): number {
  let score = 30; // Basiswert

  // Buchungsvorlauf
  if (factors.bookingLeadDays > 14) score += 20;
  else if (factors.bookingLeadDays > 7) score += 10;
  else if (factors.bookingLeadDays < 1) score += 30; // Letzte Minute
  else if (factors.bookingLeadDays <= 2) score -= 10; // Kurzfristig = eher erscheinen

  // Wochentag + Uhrzeit (Risikomuster)
  if (factors.appointmentDayOfWeek === 1 && factors.appointmentHour < 9) score += 15; // Mo frueh
  if (factors.appointmentDayOfWeek === 5 && factors.appointmentHour > 15) score += 10; // Fr nachmittag
  if ([2, 3, 4].includes(factors.appointmentDayOfWeek) &&
      factors.appointmentHour >= 11 && factors.appointmentHour <= 14) score -= 10; // Di-Do Mittag = gut

  // Kontaktdaten
  if (!factors.hasPhone) score += 25;

  // Erstbuchung (kein Track-Record)
  if (factors.isFirstBooking) score += 10;

  // Clamp 0-100
  return Math.max(0, Math.min(100, score));
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  return 'high';
}

export function getRiskColor(score: number): string {
  if (score < 30) return '#059669'; // emerald
  if (score < 60) return '#f59e0b'; // amber
  return '#ef4444'; // red
}
