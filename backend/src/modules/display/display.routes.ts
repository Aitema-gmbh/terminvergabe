import { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerDisplay, displayHeartbeat, getDisplays, getQueueBoardData } from "./display.service.js";
import { registerDisplayWebSocket } from "./display.ws.js";

const registerDisplaySchema = z.object({
  locationId: z.string().cuid(),
  deviceId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  type: z.enum(["QUEUE_BOARD", "COUNTER_DISPLAY", "INFO_SCREEN", "CHECK_IN_KIOSK"]),
});

export async function displayRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/:tenantSlug/display/register
   * Register a hardware display device.
   */
  app.post("/register", {
    schema: { tags: ["display"], summary: "Display-Gerät registrieren" },
    handler: async (request, reply) => {
      const tenantId = request.tenantId!;
      const body = registerDisplaySchema.parse(request.body);
      const display = await registerDisplay(
        tenantId,
        body.locationId,
        body.deviceId,
        body.name,
        body.type
      );
      reply.code(201);
      return { data: display };
    },
  });

  /**
   * POST /api/v1/:tenantSlug/display/heartbeat/:deviceId
   * Device heartbeat.
   */
  app.post("/heartbeat/:deviceId", {
    schema: { tags: ["display"], summary: "Display Heartbeat" },
    handler: async (request) => {
      const { deviceId } = request.params as { deviceId: string };
      await displayHeartbeat(deviceId);
      return { ok: true };
    },
  });

  /**
   * GET /api/v1/:tenantSlug/display/list/:locationId
   * List all displays for a location.
   */
  app.get("/list/:locationId", {
    schema: { tags: ["display"], summary: "Displays eines Standorts auflisten" },
    handler: async (request) => {
      const { locationId } = request.params as { locationId: string };
      const displays = await getDisplays(locationId);
      return { data: displays };
    },
  });

  /**
   * GET /api/v1/:tenantSlug/display/board/:locationId
   * Get queue board data for display rendering.
   */
  app.get("/board/:locationId", {
    schema: { tags: ["display"], summary: "Aufrufanzeige-Daten abrufen" },
    handler: async (request) => {
      const { locationId } = request.params as { locationId: string };
      const data = await getQueueBoardData(locationId);
      return { data };
    },
  });

  // Register display WebSocket
  registerDisplayWebSocket(app);
}
