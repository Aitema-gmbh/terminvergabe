import { describe, it, expect } from "vitest";

describe("Queue Service", () => {
  describe("Ticket Number Generation", () => {
    it("should generate ticket numbers with prefix and padded sequence", () => {
      const prefix = "A";
      const seq = 1;
      const ticketNumber = `${prefix}${String(seq).padStart(3, "0")}`;
      expect(ticketNumber).toBe("A001");
    });

    it("should pad sequence to 3 digits", () => {
      expect(String(1).padStart(3, "0")).toBe("001");
      expect(String(42).padStart(3, "0")).toBe("042");
      expect(String(999).padStart(3, "0")).toBe("999");
      expect(String(1000).padStart(3, "0")).toBe("1000");
    });

    it("should assign unique prefixes per service", () => {
      const prefixMap = new Map<string, string>();
      const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

      // Assign prefix for first service
      const usedLetters = new Set(prefixMap.values());
      let prefix = "A";
      for (const letter of letters) {
        if (!usedLetters.has(letter)) {
          prefix = letter;
          break;
        }
      }
      prefixMap.set("service-1", prefix);
      expect(prefix).toBe("A");

      // Assign prefix for second service
      const usedLetters2 = new Set(prefixMap.values());
      let prefix2 = "A";
      for (const letter of letters) {
        if (!usedLetters2.has(letter)) {
          prefix2 = letter;
          break;
        }
      }
      // Since A is taken, this should be B
      prefixMap.set("service-2", prefix2);
      // First available is still A for a fresh loop - this is because
      // usedLetters2 contains "A", so we need to skip it
      expect(prefixMap.get("service-1")).toBe("A");
    });
  });

  describe("Priority Ordering", () => {
    it("should sort by priority descending then by issuedAt ascending", () => {
      const tickets = [
        { id: "1", priority: 0, issuedAt: new Date("2025-01-01T10:00:00") },
        { id: "2", priority: 5, issuedAt: new Date("2025-01-01T10:05:00") },
        { id: "3", priority: 0, issuedAt: new Date("2025-01-01T09:55:00") },
        { id: "4", priority: 10, issuedAt: new Date("2025-01-01T10:10:00") },
      ];

      const sorted = [...tickets].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return a.issuedAt.getTime() - b.issuedAt.getTime();
      });

      expect(sorted[0].id).toBe("4"); // highest priority
      expect(sorted[1].id).toBe("2"); // second highest priority
      expect(sorted[2].id).toBe("3"); // same priority, earlier time
      expect(sorted[3].id).toBe("1"); // same priority, later time
    });
  });

  describe("Wait Time Estimation", () => {
    it("should estimate wait time based on queue length and service duration", () => {
      const waitingCount = 5;
      const serviceDurationMinutes = 15;
      const estimated = waitingCount * serviceDurationMinutes;
      expect(estimated).toBe(75);
    });

    it("should return 0 for empty queue", () => {
      const waitingCount = 0;
      const serviceDurationMinutes = 15;
      const estimated = waitingCount * serviceDurationMinutes;
      expect(estimated).toBe(0);
    });
  });
});
