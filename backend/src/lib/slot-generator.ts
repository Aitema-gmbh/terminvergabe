import {
  addMinutes,
  setHours,
  setMinutes,
  isAfter,
  isBefore,
  startOfDay,
  addDays,
  format,
  parse,
  isEqual,
  getDay,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";

export interface OpeningHoursInput {
  dayOfWeek: number; // 0=Sunday ... 6=Saturday
  openTime: string;  // "08:00"
  closeTime: string; // "16:00"
  breakStart?: string | null; // "12:00"
  breakEnd?: string | null;   // "13:00"
}

export interface ClosedDayInput {
  date: Date;
  recurring: boolean;
}

export interface SlotGeneratorConfig {
  /** Service duration in minutes */
  durationMinutes: number;
  /** Buffer time after each slot in minutes */
  bufferMinutes: number;
  /** Tenant-level buffer between slots */
  slotBufferMinutes: number;
  /** Opening hours for the location */
  openingHours: OpeningHoursInput[];
  /** Closed days (holidays, etc.) */
  closedDays: ClosedDayInput[];
  /** Timezone (e.g., "Europe/Berlin") */
  timezone: string;
  /** Already booked/blocked slot start times (ISO strings) */
  bookedSlots: Date[];
  /** Max parallel bookings allowed for this service */
  maxParallelBookings: number;
}

export interface GeneratedSlot {
  date: Date;
  startTime: Date;
  endTime: Date;
}

/**
 * Parse time string "HH:mm" into hours and minutes.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Set time on a date object.
 */
function setTime(date: Date, timeStr: string): Date {
  const { hours, minutes } = parseTime(timeStr);
  return setMinutes(setHours(startOfDay(date), hours), minutes);
}

/**
 * Check if a date falls on a closed day.
 */
function isClosedDay(date: Date, closedDays: ClosedDayInput[]): boolean {
  const dateStr = format(date, "yyyy-MM-dd");
  const monthDay = format(date, "MM-dd");

  return closedDays.some((cd) => {
    if (cd.recurring) {
      return format(cd.date, "MM-dd") === monthDay;
    }
    return format(cd.date, "yyyy-MM-dd") === dateStr;
  });
}

/**
 * Count how many existing bookings overlap with a given time range.
 */
function countOverlappingBookings(
  slotStart: Date,
  slotEnd: Date,
  bookedSlots: Date[],
  durationMinutes: number
): number {
  return bookedSlots.filter((booked) => {
    const bookedEnd = addMinutes(booked, durationMinutes);
    // Overlapping: booked starts before slot ends AND booked ends after slot starts
    return isBefore(booked, slotEnd) && isAfter(bookedEnd, slotStart);
  }).length;
}

/**
 * Generate available time slots for a date range.
 *
 * Algorithm:
 * 1. For each day in range, get opening hours for that day of week
 * 2. Skip closed days (holidays, special closures)
 * 3. Generate slots at regular intervals within opening hours
 * 4. Exclude break periods
 * 5. Exclude already booked slots (considering parallel booking capacity)
 * 6. Return list of available slots
 */
export function generateSlots(
  startDate: Date,
  endDate: Date,
  config: SlotGeneratorConfig
): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];
  const totalBuffer = config.bufferMinutes + config.slotBufferMinutes;
  const slotInterval = config.durationMinutes + totalBuffer;

  let currentDate = startOfDay(startDate);
  const end = startOfDay(addDays(endDate, 1));

  while (isBefore(currentDate, end)) {
    // Skip closed days
    if (isClosedDay(currentDate, config.closedDays)) {
      currentDate = addDays(currentDate, 1);
      continue;
    }

    // Get opening hours for this day of week
    const dayOfWeek = getDay(currentDate);
    const hours = config.openingHours.find(
      (oh) => oh.dayOfWeek === dayOfWeek
    );

    if (!hours) {
      // No opening hours for this day (e.g., Sunday)
      currentDate = addDays(currentDate, 1);
      continue;
    }

    // Build time windows for this day (excluding break)
    const dayOpen = setTime(currentDate, hours.openTime);
    const dayClose = setTime(currentDate, hours.closeTime);

    const timeWindows: Array<{ start: Date; end: Date }> = [];

    if (hours.breakStart && hours.breakEnd) {
      const breakStart = setTime(currentDate, hours.breakStart);
      const breakEnd = setTime(currentDate, hours.breakEnd);

      // Morning window: open -> break start
      if (isBefore(dayOpen, breakStart)) {
        timeWindows.push({ start: dayOpen, end: breakStart });
      }
      // Afternoon window: break end -> close
      if (isBefore(breakEnd, dayClose)) {
        timeWindows.push({ start: breakEnd, end: dayClose });
      }
    } else {
      // No break - entire day is one window
      timeWindows.push({ start: dayOpen, end: dayClose });
    }

    // Generate slots for each time window
    for (const window of timeWindows) {
      let slotStart = window.start;

      while (true) {
        const slotEnd = addMinutes(slotStart, config.durationMinutes);

        // Check if slot fits within the window
        if (isAfter(slotEnd, window.end)) {
          break;
        }

        // Check parallel booking capacity
        const overlapping = countOverlappingBookings(
          slotStart,
          slotEnd,
          config.bookedSlots,
          config.durationMinutes
        );

        if (overlapping < config.maxParallelBookings) {
          slots.push({
            date: startOfDay(currentDate),
            startTime: slotStart,
            endTime: slotEnd,
          });
        }

        // Move to next slot
        slotStart = addMinutes(slotStart, slotInterval);
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return slots;
}

/**
 * Generate slots for a single day - convenience wrapper.
 */
export function generateSlotsForDay(
  date: Date,
  config: SlotGeneratorConfig
): GeneratedSlot[] {
  return generateSlots(date, date, config);
}

/**
 * Validate if a specific time slot is available.
 */
export function isSlotAvailable(
  slotStart: Date,
  config: SlotGeneratorConfig
): boolean {
  const slotEnd = addMinutes(slotStart, config.durationMinutes);
  const daySlots = generateSlotsForDay(startOfDay(slotStart), config);

  return daySlots.some(
    (s) => isEqual(s.startTime, slotStart) && isEqual(s.endTime, slotEnd)
  );
}

/**
 * Generate German public holidays for a given year.
 * Returns array of dates for nationwide holidays.
 */
export function getGermanPublicHolidays(year: number): ClosedDayInput[] {
  const holidays: ClosedDayInput[] = [];

  // Fixed holidays
  const fixed = [
    { month: 1, day: 1, name: "Neujahr" },
    { month: 5, day: 1, name: "Tag der Arbeit" },
    { month: 10, day: 3, name: "Tag der Deutschen Einheit" },
    { month: 12, day: 25, name: "1. Weihnachtsfeiertag" },
    { month: 12, day: 26, name: "2. Weihnachtsfeiertag" },
  ];

  for (const h of fixed) {
    holidays.push({
      date: new Date(year, h.month - 1, h.day),
      recurring: true,
    });
  }

  // Easter-based holidays (Gauss algorithm)
  const easter = calculateEaster(year);
  const easterBased = [
    { offset: -2, name: "Karfreitag" },
    { offset: 1, name: "Ostermontag" },
    { offset: 39, name: "Christi Himmelfahrt" },
    { offset: 50, name: "Pfingstmontag" },
  ];

  for (const h of easterBased) {
    holidays.push({
      date: addDays(easter, h.offset),
      recurring: false, // Easter date changes yearly
    });
  }

  return holidays;
}

/**
 * Calculate Easter date using the Gauss/Anonymous algorithm.
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
