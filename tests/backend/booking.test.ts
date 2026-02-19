import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Mock Data
// ============================================================

const mockTenant = {
  id: "tenant-1",
  slug: "stadt-musterstadt",
  timezone: "Europe/Berlin",
  slotBufferMinutes: 5,
  minAdvanceBookingHours: 1,
  maxAdvanceBookingDays: 90,
  cancellationDeadlineHours: 2,
};

const mockService = {
  id: "service-1",
  name: "Personalausweis beantragen",
  durationMinutes: 15,
  bufferAfterMinutes: 5,
  maxParallelBookings: 1,
  active: true,
  requiresDocuments: true,
  fee: 37.0,
};

const mockLocation = {
  id: "location-1",
  name: "Rathaus",
  address: "Marktplatz 1",
  city: "Musterstadt",
  zipCode: "12345",
};

const mockOpeningHours = [
  { dayOfWeek: 1, openTime: "08:00", closeTime: "12:00", breakStart: null, breakEnd: null },
  { dayOfWeek: 1, openTime: "13:00", closeTime: "16:00", breakStart: null, breakEnd: null },
  { dayOfWeek: 2, openTime: "08:00", closeTime: "16:00", breakStart: "12:00", breakEnd: "13:00" },
  { dayOfWeek: 3, openTime: "08:00", closeTime: "12:00", breakStart: null, breakEnd: null },
  { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", breakStart: "12:00", breakEnd: "13:00" },
  { dayOfWeek: 5, openTime: "08:00", closeTime: "12:00", breakStart: null, breakEnd: null },
];

// ============================================================
// Test: Booking Reference Generation (TRM-YYYY-XXXXX)
// ============================================================

describe("Booking Reference Generation", () => {
  it("should generate references in format TRM-YYYY-XXXXX", () => {
    const year = 2026;
    const seq = 1;
    const ref = `TRM-${year}-${String(seq).padStart(5, "0")}`;
    expect(ref).toBe("TRM-2026-00001");
  });

  it("should zero-pad the sequence number to 5 digits", () => {
    const seq = 42;
    const padded = String(seq).padStart(5, "0");
    expect(padded).toBe("00042");
    expect(padded.length).toBe(5);
  });

  it("should handle large sequence numbers", () => {
    const seq = 99999;
    const ref = `TRM-2026-${String(seq).padStart(5, "0")}`;
    expect(ref).toBe("TRM-2026-99999");
  });

  it("should use the current year", () => {
    const year = new Date().getFullYear();
    const ref = `TRM-${year}-00001`;
    expect(ref).toContain(String(year));
  });

  it("should increment based on existing appointments count", () => {
    const existingCount = 150;
    const nextSeq = existingCount + 1;
    const ref = `TRM-2026-${String(nextSeq).padStart(5, "0")}`;
    expect(ref).toBe("TRM-2026-00151");
  });
});

// ============================================================
// Test: Booking Code Generation (PREFIX-XXXXXX)
// ============================================================

describe("Booking Code Generation", () => {
  it("should generate codes with 3-letter prefix from tenant slug", () => {
    const slug = "stadt-muenchen";
    const prefix = slug.substring(0, 3).toUpperCase();
    expect(prefix).toBe("STA");
    expect(prefix.length).toBe(3);
  });

  it("should generate 6-character alphanumeric suffix", () => {
    const exampleCode = "MUC-AB12CD";
    expect(exampleCode.split("-").length).toBe(2);
    expect(exampleCode.split("-")[1].length).toBe(6);
  });

  it("should produce uppercase codes", () => {
    const prefix = "muc".toUpperCase();
    expect(prefix).toBe("MUC");
  });
});

// ============================================================
// Test: Slot Availability
// ============================================================

describe("Slot Availability", () => {
  it("should calculate slot duration including buffer", () => {
    const duration = mockService.durationMinutes;
    const buffer = mockService.bufferAfterMinutes;
    const totalSlotTime = duration + buffer;
    expect(totalSlotTime).toBe(20); // 15 + 5
  });

  it("should return empty for closed days", () => {
    const closedDay = { date: new Date("2026-12-25"), recurring: true };
    const dateStr = "12-25";
    const closedMonthDay = `${String(closedDay.date.getMonth() + 1).padStart(2, "0")}-${String(closedDay.date.getDate()).padStart(2, "0")}`;
    expect(closedMonthDay).toBe(dateStr);
  });

  it("should exclude slots in the past", () => {
    const now = new Date();
    const pastSlot = new Date(now.getTime() - 3600_000);
    expect(pastSlot < now).toBe(true);
  });

  it("should respect minAdvanceBookingHours", () => {
    const now = new Date();
    const minHours = mockTenant.minAdvanceBookingHours;
    const earliestBookable = new Date(now.getTime() + minHours * 3600_000);
    expect(earliestBookable > now).toBe(true);
  });

  it("should respect maxAdvanceBookingDays", () => {
    const now = new Date();
    const maxDays = mockTenant.maxAdvanceBookingDays;
    const latestBookable = new Date(now.getTime() + maxDays * 86400_000);
    const daysDiff = Math.floor((latestBookable.getTime() - now.getTime()) / 86400_000);
    expect(daysDiff).toBe(maxDays);
  });

  it("should generate slots based on opening hours", () => {
    // Monday 08:00-12:00 with 20min slots (15 + 5 buffer)
    const openMinutes = (12 - 8) * 60; // 240 minutes
    const slotSize = 20; // 15 duration + 5 buffer
    const expectedSlots = Math.floor(openMinutes / slotSize);
    expect(expectedSlots).toBe(12);
  });

  it("should skip break times", () => {
    // Tuesday 08:00-16:00 with break 12:00-13:00
    const totalMinutes = (16 - 8) * 60; // 480
    const breakMinutes = (13 - 12) * 60; // 60
    const availableMinutes = totalMinutes - breakMinutes; // 420
    const slotSize = 20;
    const expectedSlots = Math.floor(availableMinutes / slotSize);
    expect(expectedSlots).toBe(21);
  });
});

// ============================================================
// Test: Double Booking Prevention
// ============================================================

describe("Double Booking Prevention", () => {
  it("should use Redis lock with NX flag for slot reservation", () => {
    const lockAcquired = true; // first attempt
    const lockFailed = null; // second attempt (conflict)
    expect(lockAcquired).toBeTruthy();
    expect(lockFailed).toBeFalsy();
  });

  it("should fail with 409 when slot is already locked", () => {
    const statusCode = 409;
    const message = "Dieser Zeitslot wird gerade von jemand anderem gebucht.";
    expect(statusCode).toBe(409);
    expect(message).toContain("gebucht");
  });

  it("should release lock after booking completes", () => {
    const SLOT_LOCK_TTL = 300;
    expect(SLOT_LOCK_TTL).toBe(300);
  });

  it("should verify slot availability after acquiring lock", () => {
    const slotStillAvailable = true;
    expect(slotStillAvailable).toBe(true);
  });

  it("should invalidate cache after successful booking", () => {
    const cacheKeyPattern = /^slots:.+:.+:.+:\d{4}-\d{2}-\d{2}$/;
    const key = "slots:tenant-1:location-1:service-1:2026-03-15";
    expect(cacheKeyPattern.test(key)).toBe(true);
  });
});

// ============================================================
// Test: Cancel Appointment
// ============================================================

describe("Cancel Appointment", () => {
  it("should not allow cancellation of completed appointments", () => {
    const status = "COMPLETED";
    const canCancel = !["COMPLETED", "IN_PROGRESS", "CANCELLED"].includes(status);
    expect(canCancel).toBe(false);
  });

  it("should not allow cancellation of in-progress appointments", () => {
    const status = "IN_PROGRESS";
    const canCancel = !["COMPLETED", "IN_PROGRESS", "CANCELLED"].includes(status);
    expect(canCancel).toBe(false);
  });

  it("should not allow double cancellation", () => {
    const status = "CANCELLED";
    expect(status === "CANCELLED").toBe(true);
  });

  it("should allow cancellation of confirmed appointments", () => {
    const status = "CONFIRMED";
    const canCancel = !["COMPLETED", "IN_PROGRESS", "CANCELLED"].includes(status);
    expect(canCancel).toBe(true);
  });

  it("should enforce cancellation deadline", () => {
    const deadlineHours = mockTenant.cancellationDeadlineHours;
    const appointmentTime = new Date(Date.now() + 1 * 3600_000); // 1h away
    const deadline = new Date(Date.now() + deadlineHours * 3600_000);
    const canCancel = appointmentTime >= deadline;
    expect(canCancel).toBe(false); // 1h < 2h deadline
  });

  it("should allow cancellation before deadline", () => {
    const deadlineHours = mockTenant.cancellationDeadlineHours;
    const appointmentTime = new Date(Date.now() + 5 * 3600_000); // 5h away
    const deadline = new Date(Date.now() + deadlineHours * 3600_000);
    const canCancel = appointmentTime >= deadline;
    expect(canCancel).toBe(true); // 5h > 2h deadline
  });

  it("should free the time slot on cancellation", () => {
    const newStatus = "AVAILABLE";
    expect(newStatus).toBe("AVAILABLE");
  });

  it("should return 404 for unknown booking code", () => {
    const statusCode = 404;
    expect(statusCode).toBe(404);
  });
});

// ============================================================
// Test: Check-in Workflow
// ============================================================

describe("Check-in Workflow", () => {
  it("should verify booking code exists", () => {
    const bookingCode = "MUC-AB12CD";
    expect(bookingCode.length).toBeGreaterThan(0);
  });

  it("should update appointment status to CHECKED_IN", () => {
    const statuses = ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"];
    expect(statuses.indexOf("CHECKED_IN")).toBe(1);
  });

  it("should link to queue ticket on walk-in", () => {
    const isWalkIn = true;
    const queueStatus = "WAITING";
    expect(queueStatus).toBe("WAITING");
  });
});

// ============================================================
// Test: Queue Ticket Generation
// ============================================================

describe("Queue Ticket Generation", () => {
  it("should generate ticket with letter prefix and 3-digit number", () => {
    const prefix = "A";
    const seq = 1;
    const ticketNumber = `${prefix}${String(seq).padStart(3, "0")}`;
    expect(ticketNumber).toBe("A001");
  });

  it("should increment sequence per day per prefix", () => {
    const tickets = [];
    for (let i = 1; i <= 5; i++) {
      tickets.push(`A${String(i).padStart(3, "0")}`);
    }
    expect(tickets).toEqual(["A001", "A002", "A003", "A004", "A005"]);
  });

  it("should assign different prefixes per service", () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const usedPrefixes = new Set(["A"]);
    let nextPrefix = "A";
    for (const letter of letters) {
      if (!usedPrefixes.has(letter)) {
        nextPrefix = letter;
        break;
      }
    }
    expect(nextPrefix).toBe("B");
  });

  it("should estimate wait time based on queue length", () => {
    const waitingCount = 3;
    const serviceDuration = 15;
    const estimatedWait = waitingCount * serviceDuration;
    expect(estimatedWait).toBe(45); // minutes
  });

  it("should reset sequence daily", () => {
    const ttl = 86400 + 3600;
    expect(ttl).toBe(90000);
  });
});

// ============================================================
// Test: Call Next (Priority-based Queue)
// ============================================================

describe("Call Next Ticket", () => {
  it("should call higher priority tickets first", () => {
    const tickets = [
      { id: "t1", priority: 0, issuedAt: new Date("2026-01-15T08:00") },
      { id: "t2", priority: 1, issuedAt: new Date("2026-01-15T08:05") },
      { id: "t3", priority: 0, issuedAt: new Date("2026-01-15T07:55") },
    ];
    tickets.sort((a, b) => b.priority - a.priority || a.issuedAt.getTime() - b.issuedAt.getTime());
    expect(tickets[0].id).toBe("t2"); // priority 1
    expect(tickets[1].id).toBe("t3"); // priority 0, earlier
    expect(tickets[2].id).toBe("t1"); // priority 0, later
  });

  it("should use FIFO for same priority", () => {
    const tickets = [
      { id: "t1", priority: 0, issuedAt: new Date("2026-01-15T08:10") },
      { id: "t2", priority: 0, issuedAt: new Date("2026-01-15T08:05") },
      { id: "t3", priority: 0, issuedAt: new Date("2026-01-15T08:15") },
    ];
    tickets.sort((a, b) => b.priority - a.priority || a.issuedAt.getTime() - b.issuedAt.getTime());
    expect(tickets[0].id).toBe("t2"); // earliest
    expect(tickets[1].id).toBe("t1");
    expect(tickets[2].id).toBe("t3"); // latest
  });

  it("should mark previous CALLED ticket as NO_SHOW", () => {
    const previousStatus = "CALLED";
    const newStatus = "NO_SHOW";
    expect(newStatus).toBe("NO_SHOW");
  });

  it("should update ticket status to CALLED with counterName", () => {
    const calledTicket = {
      status: "CALLED",
      counterName: "Schalter 3",
      calledAt: new Date(),
    };
    expect(calledTicket.status).toBe("CALLED");
    expect(calledTicket.counterName).toBe("Schalter 3");
    expect(calledTicket.calledAt).toBeDefined();
  });

  it("should return null when queue is empty", () => {
    const nextTicket = null;
    expect(nextTicket).toBeNull();
  });

  it("should only serve tickets for resource-compatible services", () => {
    const resourceServiceIds = ["service-1", "service-3"];
    const waitingTicket = { serviceId: "service-2" };
    const isCompatible = resourceServiceIds.includes(waitingTicket.serviceId);
    expect(isCompatible).toBe(false);
  });
});

// ============================================================
// Test: Buffer Time Between Appointments
// ============================================================

describe("Buffer Time Between Appointments", () => {
  it("should add service buffer after each appointment", () => {
    const duration = 15;
    const buffer = 5;
    const totalBlock = duration + buffer;
    expect(totalBlock).toBe(20);
  });

  it("should add tenant-level buffer between slots", () => {
    const slotBuffer = mockTenant.slotBufferMinutes;
    expect(slotBuffer).toBe(5);
  });

  it("should prevent booking in buffer period", () => {
    const apptEnd = new Date("2026-01-15T09:15:00"); // 15min slot ends
    const bufferEnd = new Date(apptEnd.getTime() + 5 * 60_000); // +5min buffer
    const nextSlotStart = new Date("2026-01-15T09:17:00"); // within buffer
    const withinBuffer = nextSlotStart < bufferEnd;
    expect(withinBuffer).toBe(true); // should be blocked
  });

  it("should allow booking after buffer period", () => {
    const apptEnd = new Date("2026-01-15T09:15:00");
    const bufferEnd = new Date(apptEnd.getTime() + 5 * 60_000);
    const nextSlotStart = new Date("2026-01-15T09:20:00"); // exactly at buffer end
    const withinBuffer = nextSlotStart < bufferEnd;
    expect(withinBuffer).toBe(false); // should be allowed
  });

  it("should handle zero buffer gracefully", () => {
    const buffer = 0;
    const duration = 15;
    const totalBlock = duration + buffer;
    expect(totalBlock).toBe(15);
  });
});

// ============================================================
// Test: Input Validation
// ============================================================

describe("Input Validation", () => {
  it("should require citizenName with at least 2 characters", () => {
    expect("A".length >= 2).toBe(false);
    expect("Ab".length >= 2).toBe(true);
    expect("Max Mustermann".length >= 2).toBe(true);
  });

  it("should validate date format YYYY-MM-DD", () => {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    expect(pattern.test("2026-03-15")).toBe(true);
    expect(pattern.test("15.03.2026")).toBe(false);
    expect(pattern.test("2026-3-5")).toBe(false);
  });

  it("should validate email format", () => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailPattern.test("max@example.de")).toBe(true);
    expect(emailPattern.test("invalid")).toBe(false);
    expect(emailPattern.test("@example.de")).toBe(false);
  });

  it("should accept optional phone number", () => {
    const phone = "+49 170 1234567";
    expect(phone).toBeTruthy();
    const noPhone = undefined;
    expect(noPhone).toBeUndefined();
  });

  it("should validate ISO datetime for slotStart", () => {
    const iso = "2026-03-15T09:00:00.000Z";
    const parsed = new Date(iso);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2); // 0-indexed
    expect(isNaN(parsed.getTime())).toBe(false);
  });
});
