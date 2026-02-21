import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  issueTicket,
  callNextTicket,
  startServing,
  completeTicket,
  getQueueStatus,
} from "./queue.service.js";
import { registerQueueWebSocket } from "./queue.ws.js";
import { registerCitizenWebSocket } from "./citizen.ws.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

const issueTicketSchema = z.object({
  serviceId: z.string().cuid(),
  locationId: z.string().cuid(),
  citizenName: z.string().max(200).optional(),
});

const callNextSchema = z.object({
  locationId: z.string().cuid(),
  resourceId: z.string().cuid(),
  counterName: z.string().max(50),
});

const ticketActionSchema = z.object({
  ticketId: z.string().cuid(),
});

export async function queueRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/:tenantSlug/queue/status/:locationId
   * Get current queue status for a location (public).
   */
  app.get("/status/:locationId", {
    schema: { tags: ["queue"], summary: "Warteschlangen-Status abrufen" },
    handler: async (request) => {
      const { locationId } = request.params as { locationId: string };
      const status = await getQueueStatus(locationId);
      return { data: status };
    },
  });

  /**
   * POST /api/v1/:tenantSlug/queue/ticket
   * Issue a new queue ticket (public - at kiosk or online).
   */
  app.post("/ticket", {
    schema: { tags: ["queue"], summary: "Wartenummer ziehen" },
    handler: async (request, reply) => {
      const body = issueTicketSchema.parse(request.body);
      const ticket = await issueTicket(body.locationId, body.serviceId, body.citizenName);
      reply.code(201);
      return { data: ticket };
    },
  });

  /**
   * POST /api/v1/:tenantSlug/queue/call-next
   * Call the next ticket (employee only).
   */
  app.post("/call-next", {
    preHandler: [requireAuth],
    schema: { tags: ["queue"], summary: "Nächste Nummer aufrufen" },
    handler: async (request) => {
      const body = callNextSchema.parse(request.body);
      const ticket = await callNextTicket(body.locationId, body.resourceId, body.counterName);
      if (!ticket) {
        return { data: null, message: "Keine wartenden Tickets." };
      }
      return { data: ticket };
    },
  });

  /**
   * POST /api/v1/:tenantSlug/queue/start-serving
   * Mark ticket as being served.
   */
  app.post("/start-serving", {
    preHandler: [requireAuth],
    schema: { tags: ["queue"], summary: "Bedienung starten" },
    handler: async (request) => {
      const body = ticketActionSchema.parse(request.body);
      const ticket = await startServing(body.ticketId);
      return { data: ticket };
    },
  });

  /**
   * POST /api/v1/:tenantSlug/queue/complete
   * Complete serving a ticket.
   */
  app.post("/complete", {
    preHandler: [requireAuth],
    schema: { tags: ["queue"], summary: "Bedienung abschließen" },
    handler: async (request) => {
      const body = ticketActionSchema.parse(request.body);
      const ticket = await completeTicket(body.ticketId);
      return { data: ticket };
    },
  });

  // Register WebSocket routes
  registerQueueWebSocket(app);

  // M2: Register citizen WebSocket for no-show push notifications
  registerCitizenWebSocket(app);
}
