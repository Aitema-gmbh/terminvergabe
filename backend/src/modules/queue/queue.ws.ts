import { FastifyInstance } from "fastify";
import { redisSub } from "../../server.js";
import type { WebSocket } from "ws";

interface ConnectedClient {
  ws: WebSocket;
  locationId: string;
  type: "queue" | "display";
}

const clients = new Set<ConnectedClient>();

/**
 * Register WebSocket route for real-time queue updates.
 *
 * Clients connect to: ws://host/api/v1/:tenantSlug/queue/ws?locationId=xxx&type=queue|display
 *
 * Messages pushed to clients:
 * - QUEUE_UPDATE: Full queue status update
 * - TICKET_CALLED: A ticket was called to a counter (for displays)
 */
export function registerQueueWebSocket(app: FastifyInstance) {
  // Subscribe to Redis PubSub channels
  const subscribedChannels = new Set<string>();

  function ensureSubscribed(locationId: string) {
    const queueChannel = `queue:${locationId}`;
    const displayChannel = `display:${locationId}`;

    if (!subscribedChannels.has(queueChannel)) {
      redisSub.subscribe(queueChannel, displayChannel);
      subscribedChannels.add(queueChannel);
      subscribedChannels.add(displayChannel);
    }
  }

  // Handle incoming Redis PubSub messages
  redisSub.on("message", (channel: string, message: string) => {
    const [type, locationId] = channel.split(":");

    for (const client of clients) {
      if (client.locationId !== locationId) continue;
      if (client.ws.readyState !== 1) continue; // WebSocket.OPEN = 1

      try {
        const parsed = JSON.parse(message);

        // Queue updates go to all clients
        if (parsed.type === "QUEUE_UPDATE") {
          client.ws.send(message);
        }

        // Display calls only go to display-type clients
        if (parsed.type === "TICKET_CALLED" && client.type === "display") {
          client.ws.send(message);
        }
      } catch (err) {
        app.log.error({ err }, "Failed to send WebSocket message");
      }
    }
  });

  // WebSocket endpoint
  app.get("/ws", { websocket: true }, (socket, request) => {
    const query = request.query as Record<string, string>;
    const locationId = query.locationId;
    const clientType = (query.type === "display" ? "display" : "queue") as "queue" | "display";

    if (!locationId) {
      socket.send(JSON.stringify({ error: "locationId parameter required" }));
      socket.close(1008, "Missing locationId");
      return;
    }

    app.log.info({ locationId, clientType }, "WebSocket client connected");

    const client: ConnectedClient = {
      ws: socket,
      locationId,
      type: clientType,
    };

    clients.add(client);
    ensureSubscribed(locationId);

    // Send welcome message
    socket.send(
      JSON.stringify({
        type: "CONNECTED",
        data: {
          locationId,
          clientType,
          timestamp: new Date().toISOString(),
        },
      })
    );

    // Handle client messages (e.g., ping/pong)
    socket.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "PING") {
          socket.send(JSON.stringify({ type: "PONG", timestamp: new Date().toISOString() }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    // Cleanup on disconnect
    socket.on("close", () => {
      clients.delete(client);
      app.log.info({ locationId, clientType }, "WebSocket client disconnected");
    });

    socket.on("error", (err) => {
      app.log.error({ err, locationId }, "WebSocket error");
      clients.delete(client);
    });
  });

  // Periodic cleanup of dead connections
  setInterval(() => {
    for (const client of clients) {
      if (client.ws.readyState > 1) {
        clients.delete(client);
      }
    }
  }, 30000);
}

/**
 * Get the number of connected clients for a location.
 */
export function getConnectedClientCount(locationId: string): number {
  let count = 0;
  for (const client of clients) {
    if (client.locationId === locationId && client.ws.readyState === 1) {
      count++;
    }
  }
  return count;
}
