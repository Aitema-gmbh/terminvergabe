import { describe, it, expect } from "vitest";
import {
  generateSlots,
  generateSlotsForDay,
  isSlotAvailable,
  getGermanPublicHolidays,
  type SlotGeneratorConfig,
} from "../../backend/src/lib/slot-generator.js";

const baseConfig: SlotGeneratorConfig = {
  durationMinutes: 15,
  bufferMinutes: 5,
  slotBufferMinutes: 0,
  openingHours: [
    { dayOfWeek: 1, openTime: "08:00", closeTime: "16:00", breakStart: "12:00", breakEnd: "13:00" },
    { dayOfWeek: 2, openTime: "08:00", closeTime: "16:00", breakStart: "12:00", breakEnd: "13:00" },
    { dayOfWeek: 3, openTime: "08:00", closeTime: "16:00", breakStart: "12:00", breakEnd: "13:00" },
    { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
    { dayOfWeek: 5, openTime: "08:00", closeTime: "12:00", breakStart: null, breakEnd: null },
  ],
  closedDays: [],
  timezone: "Europe/Berlin",
  bookedSlots: [],
  maxParallelBookings: 1,
};

describe("Slot Generator", () => {
  describe("generateSlotsForDay", () => {
    it("should generate slots for a regular Monday", () => {
      // 2025-01-06 is a Monday
      const date = new Date(2025, 0, 6);
      const slots = generateSlotsForDay(date, baseConfig);

      expect(slots.length).toBeGreaterThan(0);

      // First slot should start at 08:00
      const firstSlot = slots[0];
      expect(firstSlot.startTime.getHours()).toBe(8);
      expect(firstSlot.startTime.getMinutes()).toBe(0);

      // Should have no slots during lunch break (12:00-13:00)
      const lunchSlots = slots.filter((s) => {
        const h = s.startTime.getHours();
        return h === 12;
      });
      expect(lunchSlots.length).toBe(0);
    });

    it("should return no slots on Sunday", () => {
      // 2025-01-05 is a Sunday
      const date = new Date(2025, 0, 5);
      const slots = generateSlotsForDay(date, baseConfig);
      expect(slots.length).toBe(0);
    });

    it("should return no slots on a closed day", () => {
      const date = new Date(2025, 0, 6); // Monday
      const config = {
        ...baseConfig,
        closedDays: [{ date: new Date(2025, 0, 6), recurring: false }],
      };
      const slots = generateSlotsForDay(date, config);
      expect(slots.length).toBe(0);
    });

    it("should handle Friday half-day (no break)", () => {
      // 2025-01-10 is a Friday
      const date = new Date(2025, 0, 10);
      const slots = generateSlotsForDay(date, baseConfig);

      // 08:00-12:00 = 4 hours = 240 minutes
      // 15 min + 5 min buffer = 20 min per slot
      // 240 / 20 = 12 slots
      expect(slots.length).toBe(12);

      // Last slot should end by 12:00
      const lastSlot = slots[slots.length - 1];
      expect(lastSlot.endTime.getHours()).toBeLessThanOrEqual(12);
    });
  });

  describe("generateSlots (multi-day)", () => {
    it("should generate slots for a full week", () => {
      const start = new Date(2025, 0, 6); // Monday
      const end = new Date(2025, 0, 12);  // Sunday
      const slots = generateSlots(start, end, baseConfig);

      // Should have slots for Mon-Fri, none for Sat-Sun
      expect(slots.length).toBeGreaterThan(0);

      // No weekend slots
      const weekendSlots = slots.filter((s) => {
        const day = s.date.getDay();
        return day === 0 || day === 6;
      });
      expect(weekendSlots.length).toBe(0);
    });
  });

  describe("Booked slots exclusion", () => {
    it("should exclude already booked slots", () => {
      const date = new Date(2025, 0, 6);
      const bookedTime = new Date(2025, 0, 6, 8, 0, 0);

      const configWithBooking = {
        ...baseConfig,
        bookedSlots: [bookedTime],
      };

      const slots = generateSlotsForDay(date, configWithBooking);

      // The 08:00 slot should be excluded
      const eightAmSlot = slots.find(
        (s) => s.startTime.getHours() === 8 && s.startTime.getMinutes() === 0
      );
      expect(eightAmSlot).toBeUndefined();
    });

    it("should allow parallel bookings when configured", () => {
      const date = new Date(2025, 0, 6);
      const bookedTime = new Date(2025, 0, 6, 8, 0, 0);

      const configParallel = {
        ...baseConfig,
        maxParallelBookings: 3,
        bookedSlots: [bookedTime],
      };

      const slots = generateSlotsForDay(date, configParallel);

      // The 08:00 slot should still be available (1 booked, max 3)
      const eightAmSlot = slots.find(
        (s) => s.startTime.getHours() === 8 && s.startTime.getMinutes() === 0
      );
      expect(eightAmSlot).toBeDefined();
    });
  });

  describe("German Public Holidays", () => {
    it("should include nationwide holidays", () => {
      const holidays = getGermanPublicHolidays(2025);

      expect(holidays.length).toBeGreaterThan(0);

      // Check for fixed holidays
      const neujahr = holidays.find(
        (h) => h.date.getMonth() === 0 && h.date.getDate() === 1
      );
      expect(neujahr).toBeDefined();

      const tagDerEinheit = holidays.find(
        (h) => h.date.getMonth() === 9 && h.date.getDate() === 3
      );
      expect(tagDerEinheit).toBeDefined();
    });

    it("should calculate Easter correctly for 2025", () => {
      const holidays = getGermanPublicHolidays(2025);

      // Easter 2025 is April 20
      // Karfreitag = Easter - 2 = April 18
      const karfreitag = holidays.find(
        (h) => h.date.getMonth() === 3 && h.date.getDate() === 18
      );
      expect(karfreitag).toBeDefined();

      // Ostermontag = Easter + 1 = April 21
      const ostermontag = holidays.find(
        (h) => h.date.getMonth() === 3 && h.date.getDate() === 21
      );
      expect(ostermontag).toBeDefined();
    });
  });

  describe("isSlotAvailable", () => {
    it("should return true for an available slot", () => {
      const slotStart = new Date(2025, 0, 6, 8, 0, 0); // Monday 08:00
      const available = isSlotAvailable(slotStart, baseConfig);
      expect(available).toBe(true);
    });

    it("should return false for a slot outside opening hours", () => {
      const slotStart = new Date(2025, 0, 6, 6, 0, 0); // Monday 06:00
      const available = isSlotAvailable(slotStart, baseConfig);
      expect(available).toBe(false);
    });

    it("should return false for a slot during lunch break", () => {
      const slotStart = new Date(2025, 0, 6, 12, 15, 0); // Monday 12:15
      const available = isSlotAvailable(slotStart, baseConfig);
      expect(available).toBe(false);
    });
  });
});
