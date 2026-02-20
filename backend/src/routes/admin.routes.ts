/**
 * aitema|Termin - Admin-API
 *
 * Verwaltungs-Endpunkte:
 * - POST /admin/seed    - Demo-Daten laden
 * - GET  /admin/health  - Health Check (DB, Redis)
 * - POST /admin/tenant  - Neuen Tenant anlegen
 * - GET  /admin/tenants - Alle Tenants listen
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { seedMusterstadt } from "../services/seed.service";

export async function adminRoutes(app: FastifyInstance) {
  // ============================================================
  // Seed: Demo-Daten laden
  // ============================================================
  app.post(
    "/admin/seed",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await seedMusterstadt();
        return reply.code(201).send({
          success: true,
          message: "Demo-Daten fuer Musterstadt erfolgreich erstellt",
          data: result,
        });
      } catch (err: any) {
        app.log.error(err, "Seed fehlgeschlagen");
        return reply.code(500).send({
          success: false,
          error: err.message,
        });
      }
    }
  );

  // ============================================================
  // Health Check
  // ============================================================
  app.get(
    "/admin/health",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const health: Record<string, any> = {
        status: "healthy",
        service: "aitema-termin",
        version: "0.1.0",
        timestamp: new Date().toISOString(),
        checks: {},
      };

      // Database Check
      try {
        const result = await app.prisma.$queryRaw`SELECT 1 as ok`;
        const tableCount = await app.prisma.$queryRaw<
          { count: bigint }[]
        >`SELECT count(*) as count FROM information_schema.tables WHERE table_schema = public`;
        health.checks.database = {
          status: "healthy",
          tables: Number(tableCount[0]?.count || 0),
        };
      } catch (err: any) {
        health.status = "degraded";
        health.checks.database = {
          status: "unhealthy",
          error: err.message,
        };
      }

      // Redis Check (optional)
      try {
        if (app.redis) {
          await app.redis.ping();
          const info = await app.redis.info("memory");
          const memMatch = info.match(/used_memory_human:(.+)/);
          health.checks.redis = {
            status: "healthy",
            usedMemory: memMatch ? memMatch[1].trim() : "unknown",
          };
        } else {
          health.checks.redis = { status: "not_configured" };
        }
      } catch (err: any) {
        health.status = "degraded";
        health.checks.redis = {
          status: "unhealthy",
          error: err.message,
        };
      }

      // Tenant-Statistiken
      try {
        const tenantCount = await app.prisma.tenant.count();
        const appointmentCount = await app.prisma.appointment.count();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayAppointments = await app.prisma.appointment.count({
          where: {
            date: { gte: todayStart, lte: todayEnd },
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
          },
        });

        health.checks.stats = {
          tenants: tenantCount,
          totalAppointments: appointmentCount,
          todayAppointments,
        };
      } catch {
        // Stats sind optional
      }

      const statusCode = health.status === "healthy" ? 200 : 503;
      return reply.code(statusCode).send(health);
    }
  );

  // ============================================================
  // Tenant erstellen
  // ============================================================
  app.post(
    "/admin/tenant",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        name: string;
        slug: string;
        contactEmail?: string;
        website?: string;
      };

      if (!body.name || !body.slug) {
        return reply.code(400).send({
          error: "name und slug sind erforderlich",
        });
      }

      // Slug validieren
      if (!/^[a-z0-9-]+$/.test(body.slug)) {
        return reply.code(400).send({
          error:
            "slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten",
        });
      }

      try {
        // Pruefen ob Slug schon existiert
        const existing = await app.prisma.tenant.findUnique({
          where: { slug: body.slug },
        });
        if (existing) {
          return reply.code(409).send({
            error: "Tenant mit slug  + body.slug +  existiert bereits",
          });
        }

        const tenant = await app.prisma.tenant.create({
          data: {
            name: body.name,
            slug: body.slug,
            active: true,
            settings: {
              contactEmail: body.contactEmail,
              website: body.website,
              maxBookingsPerPerson: 3,
              bookingLeadDays: 30,
              reminderHoursBefore: 24,
              allowWalkIn: true,
            },
          },
        });

        // Default-Settings erstellen
        await app.prisma.tenantSettings.create({
          data: {
            tenantId: tenant.id,
            maxBookingsPerPerson: 3,
            bookingLeadDays: 30,
            reminderHoursBefore: 24,
            cancelDeadlineHours: 2,
            allowWalkIn: true,
          },
        });

        return reply.code(201).send({
          success: true,
          tenant: {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
          },
        });
      } catch (err: any) {
        return reply.code(500).send({ error: err.message });
      }
    }
  );

  // ============================================================
  // Alle Tenants listen
  // ============================================================
  app.get(
    "/admin/tenants",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tenants = await app.prisma.tenant.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            active: true,
            createdAt: true,
            _count: {
              select: {
                locations: true,
                services: true,
                appointments: true,
              },
            },
          },
          orderBy: { name: "asc" },
        });

        return {
          tenants: tenants.map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            active: t.active,
            createdAt: t.createdAt,
            stats: {
              locations: t._count.locations,
              services: t._count.services,
              appointments: t._count.appointments,
            },
          })),
          total: tenants.length,
        };
      } catch (err: any) {
        return reply.code(500).send({ error: err.message });
      }
    }
  );
}
