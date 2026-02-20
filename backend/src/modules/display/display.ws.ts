import { FastifyInstance } from "fastify";
import { redisSub } from "../../server.js";
import { getQueueBoardData } from "./display.service.js";
import { displayHeartbeat } from "./display.service.js";
import type { WebSocket } from "ws";

interface DisplayClient {
  ws: WebSocket;
  locationId: string;
  deviceId?: string;
}

const displayClients = new Set<DisplayClient>();
const subscribedChannels = new Set<string>();

/**
 * WebSocket handler specifically for hardware display devices.
 *
 * Connects to: ws://host/api/v1/:tenantSlug/display/ws?locationId=xxx&deviceId=yyy
 *
 * Receives:
 * - BOARD_UPDATE: Full board data refresh
 * - TICKET_CALLED: New ticket called with animation trigger
 */
export function registerDisplayWebSocket(app: FastifyInstance) {
  function ensureSubscribed(locationId: string) {
    const channel = `display:${locationId}`;
    if (!subscribedChannels.has(channel)) {
      redisSub.subscribe(channel);
      subscribedChannels.add(channel);
    }
  }

  redisSub.on("message", async (channel: string, message: string) => {
    if (!channel.startsWith("display:")) return;
    const locationId = channel.split(":")[1];

    for (const client of displayClients) {
      if (client.locationId !== locationId || client.ws.readyState !== 1) continue;

      try {
        // For TICKET_CALLED events, also send the full board update
        const parsed = JSON.parse(message);
        client.ws.send(message);

        if (parsed.type === "TICKET_CALLED") {
          const boardData = await getQueueBoardData(locationId);
          client.ws.send(
            JSON.stringify({ type: "BOARD_UPDATE", data: boardData })
          );
        }
      } catch (err) {
        app.log.error({ err }, "Failed to send display WebSocket message");
      }
    }
  });

  app.get("/ws", { websocket: true }, async (socket, request) => {
    const query = request.query as Record<string, string>;
    const locationId = query.locationId;
    const deviceId = query.deviceId;

    if (!locationId) {
      socket.send(JSON.stringify({ error: "locationId required" }));
      socket.close(1008, "Missing locationId");
      return;
    }

    app.log.info({ locationId, deviceId }, "Display WebSocket connected");

    const client: DisplayClient = { ws: socket, locationId, deviceId };
    displayClients.add(client);
    ensureSubscribed(locationId);

    // Send initial board data
    const boardData = await getQueueBoardData(locationId);
    socket.send(JSON.stringify({ type: "BOARD_UPDATE", data: boardData }));

    socket.on("message", async (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "HEARTBEAT" && deviceId) {
          await displayHeartbeat(deviceId);
          socket.send(JSON.stringify({ type: "HEARTBEAT_ACK" }));
        }

        if (msg.type === "PING") {
          socket.send(JSON.stringify({ type: "PONG" }));
        }
      } catch {
        // Ignore
      }
    });

    socket.on("close", () => {
      displayClients.delete(client);
      app.log.info({ locationId, deviceId }, "Display WebSocket disconnected");
    });

    socket.on("error", (err) => {
      displayClients.delete(client);
      app.log.error({ err }, "Display WebSocket error");
    });
  });

  // Cleanup interval
  setInterval(() => {
    for (const client of displayClients) {
      if (client.ws.readyState > 1) {
        displayClients.delete(client);
      }
    }
  }, 30000);
}
