/**
 * aitema|Termin - Fastify Server Entry Point
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';
import { bookingRoutes } from './routes/booking.routes';

const prisma = new PrismaClient();

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

  // Decorate with Prisma
  app.decorate('prisma', prisma);

  // Plugins
  await app.register(cors, {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Routes
  await app.register(bookingRoutes);

  // Health check
  app.get('/health', async () => ({
    status: 'healthy',
    service: 'aitema-termin',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  }));

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`${signal} received, shutting down...`);
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    });
  }

  // Start
  const port = parseInt(process.env.PORT || '3000');
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`aitema|Termin running on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
