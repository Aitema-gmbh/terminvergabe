/**
 * aitema|Termin - Statistics API Routes
 *
 * Fastify routes for analytics, reporting, and capacity management.
 * All routes require staff authentication.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  getDailyStats,
  getWeeklyReport,
  getCapacityForecast,
  getServiceAnalytics,
  getEmployeeStats,
  exportCSV,
  getWaitTimeDistribution,
} from "../services/statistics.service.js";
import { requireAuth } from "../middleware/auth.js";

// ============================================================
// Validation Schemas
// ============================================================

const dateQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD")
    .optional()
    .default(() => new Date().toISOString().split("T")[0]),
});

const weekQuerySchema = z.object({
  week: z
    .string()
    .regex(/^\d{4}-W\d{2}$/, "Format: YYYY-Www")
    .optional(),
});

const capacityQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(14),
  lookback: z.coerce.number().int().min(1).max(12).optional().default(4),
});

const rangeQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD")
    .optional()
    .default(() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split("T")[0];
    }),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD")
    .optional()
    .default(() => new Date().toISOString().split("T")[0]),
});

const exportQuerySchema = rangeQuerySchema.extend({
  format: z.enum(["csv"]).optional().default("csv"),
});

// ============================================================
// Helper: resolve tenant + location
// ============================================================

async function resolveTenantLocation(
  app: FastifyInstance,
  tenantSlug: string,
  locationId?: string
) {
  const tenant = await app.prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant || !tenant.active) {
    return null;
  }

  // Use first location if none specified
  let resolvedLocationId = locationId;
  if (!resolvedLocationId) {
    const firstLocation = await app.prisma.location.findFirst({
      where: { tenantId: tenant.id, active: true },
      select: { id: true },
    });
    resolvedLocationId = firstLocation?.id;
  }

  return { tenantId: tenant.id, locationId: resolvedLocationId || "" };
}

// ============================================================
// Routes
// ============================================================

export async function statisticsRoutes(app: FastifyInstance) {
  // All stats routes require authentication
  app.addHook("preHandler", requireAuth);

  /**
   * GET /:tenantSlug/stats/daily?date=YYYY-MM-DD
   * Daily statistics with hourly breakdown.
   */
  app.get(
    "/daily",
    {
      schema: {
        tags: ["statistics"],
        summary: "Tagesstatistik abrufen",
        querystring: {
          type: "object",
          properties: {
            date: { type: "string" },
            locationId: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };
      const query = dateQuerySchema.parse(request.query);
      const { locationId: qLocationId } = request.query as { locationId?: string };

      const ctx = await resolveTenantLocation(app, tenantSlug, qLocationId);
      if (!ctx) return reply.code(404).send({ error: "Kommune nicht gefunden" });

      const stats = await getDailyStats(ctx.tenantId, ctx.locationId, new Date(query.date));
      return { data: stats };
    }
  );

  /**
   * GET /:tenantSlug/stats/weekly?week=YYYY-Www
   * Weekly report with peaks and valleys.
   */
  app.get(
    "/weekly",
    {
      schema: {
        tags: ["statistics"],
        summary: "Wochenbericht abrufen",
        querystring: {
          type: "object",
          properties: {
            week: { type: "string" },
            locationId: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };
      const query = weekQuerySchema.parse(request.query);
      const { locationId: qLocationId } = request.query as { locationId?: string };

      const ctx = await resolveTenantLocation(app, tenantSlug, qLocationId);
      if (!ctx) return reply.code(404).send({ error: "Kommune nicht gefunden" });

      // Parse week string or use current week
      let weekStart: Date;
      if (query.week) {
        const [year, weekNum] = query.week.split("-W").map(Number);
        weekStart = new Date(year, 0, 1 + (weekNum - 1) * 7);
      } else {
        weekStart = new Date();
      }

      const report = await getWeeklyReport(ctx.tenantId, ctx.locationId, weekStart);
      return { data: report };
    }
  );

  /**
   * GET /:tenantSlug/stats/capacity?days=14&lookback=4
   * Capacity forecast based on historical moving average.
   */
  app.get(
    "/capacity",
    {
      schema: {
        tags: ["statistics"],
        summary: "Kapazitaetsprognose abrufen",
        querystring: {
          type: "object",
          properties: {
            days: { type: "number" },
            lookback: { type: "number" },
            locationId: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };
      const query = capacityQuerySchema.parse(request.query);
      const { locationId: qLocationId } = request.query as { locationId?: string };

      const ctx = await resolveTenantLocation(app, tenantSlug, qLocationId);
      if (!ctx) return reply.code(404).send({ error: "Kommune nicht gefunden" });

      const forecast = await getCapacityForecast(
        ctx.tenantId,
        ctx.locationId,
        query.days,
        query.lookback
      );
      return { data: forecast };
    }
  );

  /**
   * GET /:tenantSlug/stats/services?from=&to=
   * Service analytics breakdown.
   */
  app.get(
    "/services",
    {
      schema: {
        tags: ["statistics"],
        summary: "Dienstleistungsanalyse abrufen",
        querystring: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            locationId: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };
      const query = rangeQuerySchema.parse(request.query);
      const { locationId: qLocationId } = request.query as { locationId?: string };

      const ctx = await resolveTenantLocation(app, tenantSlug, qLocationId);
      if (!ctx) return reply.code(404).send({ error: "Kommune nicht gefunden" });

      const analytics = await getServiceAnalytics(
        ctx.tenantId,
        ctx.locationId,
        new Date(query.from),
        new Date(query.to)
      );
      return { data: analytics };
    }
  );

  /**
   * GET /:tenantSlug/stats/employees?from=&to=
   * Employee performance statistics.
   */
  app.get(
    "/employees",
    {
      schema: {
        tags: ["statistics"],
        summary: "Mitarbeiterstatistik abrufen",
        querystring: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            locationId: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };
      const query = rangeQuerySchema.parse(request.query);
      const { locationId: qLocationId } = request.query as { locationId?: string };

      const ctx = await resolveTenantLocation(app, tenantSlug, qLocationId);
      if (!ctx) return reply.code(404).send({ error: "Kommune nicht gefunden" });

      const stats = await getEmployeeStats(
        ctx.tenantId,
        ctx.locationId,
        new Date(query.from),
        new Date(query.to)
      );
      return { data: stats };
    }
  );

  /**
   * GET /:tenantSlug/stats/export?format=csv&from=&to=
   * CSV export of statistics.
   */
  app.get(
    "/export",
    {
      schema: {
        tags: ["statistics"],
        summary: "Statistik als CSV exportieren",
        querystring: {
          type: "object",
          properties: {
            format: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
            locationId: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };
      const query = exportQuerySchema.parse(request.query);
      const { locationId: qLocationId } = request.query as { locationId?: string };

      const ctx = await resolveTenantLocation(app, tenantSlug, qLocationId);
      if (!ctx) return reply.code(404).send({ error: "Kommune nicht gefunden" });

      const csv = await exportCSV(
        ctx.tenantId,
        ctx.locationId,
        new Date(query.from),
        new Date(query.to)
      );

      const filename = `statistik_${query.from}_${query.to}.csv`;

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(csv);
    }
  );

  /**
   * GET /:tenantSlug/stats/wait-times?from=&to=
   * Wait time distribution in buckets.
   */
  app.get(
    "/wait-times",
    {
      schema: {
        tags: ["statistics"],
        summary: "Wartezeitenverteilung abrufen",
        querystring: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            locationId: { type: "string" },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantSlug } = request.params as { tenantSlug: string };
      const query = rangeQuerySchema.parse(request.query);
      const { locationId: qLocationId } = request.query as { locationId?: string };

      const ctx = await resolveTenantLocation(app, tenantSlug, qLocationId);
      if (!ctx) return reply.code(404).send({ error: "Kommune nicht gefunden" });

      const distribution = await getWaitTimeDistribution(
        ctx.tenantId,
        ctx.locationId,
        new Date(query.from),
        new Date(query.to)
      );
      return { data: distribution };
    }
  );
}
