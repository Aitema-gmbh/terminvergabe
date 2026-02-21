import { FastifyInstance } from "fastify";
import {
  getAvailableSlotsSchema,
  getAvailableDaysSchema,
  createBookingSchema,
  cancelBookingSchema,
  lookupBookingSchema,
} from "./booking.schema.js";
import {
  getAvailableSlots,
  getAvailableDays,
  createBooking,
  cancelBooking,
  lookupBooking,
  checkinByCode,
} from "./booking.service.js";
import { bookingRateLimit } from "../../middleware/rateLimit.js";

export async function bookingRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/:tenantSlug/booking/slots
   * Get available time slots for a specific date.
   */
  app.get("/slots", {
    schema: {
      tags: ["booking"],
      summary: "Verfügbare Zeitslots abrufen",
      querystring: {
        type: "object",
        properties: {
          serviceId: { type: "string" },
          locationId: { type: "string" },
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          resourceId: { type: "string" },
        },
        required: ["serviceId", "locationId", "date"],
      },
    },
    handler: async (request, reply) => {
      const tenantId = request.tenantId!;
      const query = getAvailableSlotsSchema.parse(request.query);
      const slots = await getAvailableSlots(tenantId, query);
      return { data: slots, count: slots.length };
    },
  });

  /**
   * GET /api/v1/:tenantSlug/booking/days
   * Get days with available slots for a month.
   */
  app.get("/days", {
    schema: {
      tags: ["booking"],
      summary: "Verfügbare Tage im Monat abrufen",
      querystring: {
        type: "object",
        properties: {
          serviceId: { type: "string" },
          locationId: { type: "string" },
          month: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
        },
        required: ["serviceId", "locationId", "month"],
      },
    },
    handler: async (request, reply) => {
      const tenantId = request.tenantId!;
      const query = getAvailableDaysSchema.parse(request.query);
      const days = await getAvailableDays(tenantId, query);
      return { data: days };
    },
  });

  /**
   * POST /api/v1/:tenantSlug/booking/create
   * Create a new appointment.
   */
  app.post("/create", {
    preHandler: [bookingRateLimit],
    schema: {
      tags: ["booking"],
      summary: "Neuen Termin buchen",
    },
    handler: async (request, reply) => {
      const tenantId = request.tenantId!;
      const tenantSlug = request.tenantSlug!;
      const body = createBookingSchema.parse(request.body);
      const result = await createBooking(tenantId, tenantSlug, body);
      reply.code(201);
      return { data: result };
    },
  });

  /**
   * POST /api/v1/:tenantSlug/booking/cancel
   * Cancel an existing appointment.
   */
  app.post("/cancel", {
    schema: {
      tags: ["booking"],
      summary: "Termin stornieren",
    },
    handler: async (request, reply) => {
      const tenantId = request.tenantId!;
      const body = cancelBookingSchema.parse(request.body);
      const result = await cancelBooking(tenantId, body.bookingCode, body.reason);
      return { data: result };
    },
  });

  /**
   * GET /api/v1/:tenantSlug/booking/lookup/:bookingCode
   * Look up an appointment by booking code.
   */
  app.get("/lookup/:bookingCode", {
    schema: {
      tags: ["booking"],
      summary: "Termin per Buchungscode nachschlagen",
    },
    handler: async (request, reply) => {
      const { bookingCode } = lookupBookingSchema.parse(request.params);
      const result = await lookupBooking(bookingCode);
      return { data: result };
    },
  });

  /**
   * POST /api/v1/:tenantSlug/booking/checkin/:bookingCode
   * T2: QR-Code Check-in - Buerger checkt per QR-Code ein.
   */
  app.post("/checkin/:bookingCode", {
    schema: {
      tags: ["booking"],
      summary: "QR-Code Check-in",
    },
    handler: async (request, reply) => {
      const { bookingCode } = request.params as { bookingCode: string };
      const result = await checkinByCode(bookingCode);
      return { data: result };
    },
  });
}
