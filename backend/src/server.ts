import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import cookie from "@fastify/cookie";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { getConfig, getCorsOrigins } from "./config.js";
import { bookingRoutes } from "./modules/booking/booking.routes.js";
import { queueRoutes } from "./modules/queue/queue.routes.js";
import { displayRoutes } from "./modules/display/display.routes.js";
import { adminRoutes } from "./modules/admin/admin.routes.js";
import { calendarRoutes } from "./modules/admin/calendar.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import { startNotificationWorker } from "./modules/notification/notification.worker.js";

const config = getConfig();

// Prisma Client
export const prisma = new PrismaClient({
  log: config.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});

// Redis Client
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 5000);
  },
});

// Redis for Pub/Sub (separate connection required)
export const redisSub = new Redis(config.REDIS_URL);
export const redisPub = new Redis(config.REDIS_URL);

async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
      transport:
        config.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
    trustProxy: true,
  });

  // --- Plugins ---
  await app.register(helmet, {
    contentSecurityPolicy: config.NODE_ENV === "production",
  });

  await app.register(cors, {
    origin: getCorsOrigins(),
    credentials: true,
  });

  await app.register(rateLimit, {
    max: config.NODE_ENV === "production" ? 100 : 1000,
    timeWindow: "1 minute",
  });

  await app.register(cookie);

  await app.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "aitema|Termin API",
        description: "Kommunales Terminvergabe- und Besuchersteuerungssystem",
        version: "0.1.0",
      },
      servers: [
        { url: `http://localhost:${config.PORT}`, description: "Development" },
      ],
      tags: [
        { name: "booking", description: "Terminbuchung" },
        { name: "queue", description: "Warteschlangen-Management" },
        { name: "display", description: "Aufrufanlage" },
        { name: "admin", description: "Administration" },
        { name: "auth", description: "Authentifizierung" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  // --- Decorators ---
  app.decorate("prisma", prisma);
  app.decorate("redis", redis);

  // --- Health Check ---
  app.get("/health", async () => {
    const dbHealthy = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
    const redisHealthy = await redis.ping().then(() => true).catch(() => false);
    return {
      status: dbHealthy && redisHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? "up" : "down",
        redis: redisHealthy ? "up" : "down",
      },
    };
  });

  // --- Tenant Middleware ---
  app.addHook("onRequest", tenantMiddleware);

  // --- Routes ---
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(bookingRoutes, { prefix: "/api/v1/:tenantSlug/booking" });
  await app.register(queueRoutes, { prefix: "/api/v1/:tenantSlug/queue" });
  await app.register(displayRoutes, { prefix: "/api/v1/:tenantSlug/display" });
  await app.register(adminRoutes, { prefix: "/api/v1/admin" });
  // M3: CalDAV Staff-Kalender
  await app.register(calendarRoutes, { prefix: "/api/v1/admin" });

  return app;
}

async function start() {
  const app = await buildApp();

  // Start notification worker
  startNotificationWorker();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    await prisma.$disconnect();
    redis.disconnect();
    redisSub.disconnect();
    redisPub.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`aitema|Termin Backend running on port ${config.PORT}`);
    app.log.info(`API Docs: http://localhost:${config.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

export { buildApp };
