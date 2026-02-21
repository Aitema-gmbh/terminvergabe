/**
 * M2: WebSocket-Endpunkt fuer Buerger-Echtzeit-Updates
 *
 * Buerger verbinden sich mit ws://.../api/v1/:tenantSlug/queue/ws/citizen/:bookingCode
 * und erhalten eine Push-Benachrichtigung wenn ihre Nummer aufgerufen wird.
 *
 * Kommunikationsfluss:
 *   1. Buerger verbindet sich (bookingCode aus URL)
 *   2. Backend abonniert Redis-Kanal citizen:<bookingCode>
 *   3. Bei "call-next" publiziert queue.service.ts auf diesen Kanal
 *   4. Buerger erhaelt 'TICKET_CALLED' Event und zeigt Browser-Notification
 */
import { FastifyInstance } from "fastify";
import Redis from "ioredis";
import { redisSub as globalRedisSub } from "../../server.js";

export function registerCitizenWebSocket(app: FastifyInstance) {
  // Jede Verbindung braucht eine eigene Redis Subscriber-Instanz
  // (Redis pub/sub ist connection-gebunden)
  const citizenChannels = new Map<string, Set<any>>(); // channel -> Set of sockets

  // Zentraler Redis-Subscriber fuer alle citizen:-Kanaele
  const citizenSub = globalRedisSub.duplicate();

  citizenSub.on("message", (channel: string, message: string) => {
    const sockets = citizenChannels.get(channel);
    if (!sockets) return;

    for (const socket of sockets) {
      try {
        if (socket.readyState === 1) { // WebSocket.OPEN
          socket.send(message);
        }
      } catch (err) {
        app.log.error({ err, channel }, "Failed to send citizen WebSocket message");
      }
    }
  });

  /**
   * GET /api/v1/:tenantSlug/queue/ws/citizen/:bookingCode
   * WebSocket-Verbindung fuer Buerger, um aufgerufen zu werden.
   */
  app.get("/ws/citizen/:bookingCode", { websocket: true }, (socket, request) => {
    const { bookingCode } = request.params as { bookingCode: string };
    const channel = `citizen:${bookingCode}`;

    app.log.info({ bookingCode }, "Citizen WebSocket connected");

    // In Channel-Map eintragen
    if (!citizenChannels.has(channel)) {
      citizenChannels.set(channel, new Set());
      citizenSub.subscribe(channel).catch((err) => {
        app.log.error({ err, channel }, "Redis subscribe failed");
      });
    }
    citizenChannels.get(channel)!.add(socket);

    // Willkommens-Bestaetigung
    socket.send(
      JSON.stringify({
        type: "CONNECTED",
        bookingCode,
        message: "Verbunden. Sie werden benachrichtigt wenn Ihre Nummer aufgerufen wird.",
        timestamp: new Date().toISOString(),
      })
    );

    // Ping/Pong fuer Keep-alive
    socket.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "PING") {
          socket.send(JSON.stringify({ type: "PONG", timestamp: new Date().toISOString() }));
        }
      } catch {
        // Ignoriere fehlerhafte Nachrichten
      }
    });

    // Cleanup bei Verbindungsende
    socket.on("close", () => {
      const sockets = citizenChannels.get(channel);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          citizenChannels.delete(channel);
          citizenSub.unsubscribe(channel).catch(() => {});
        }
      }
      app.log.info({ bookingCode }, "Citizen WebSocket disconnected");
    });

    socket.on("error", (err) => {
      app.log.error({ err, bookingCode }, "Citizen WebSocket error");
      citizenChannels.get(channel)?.delete(socket);
    });
  });
}
