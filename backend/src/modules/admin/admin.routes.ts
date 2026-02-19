import { FastifyInstance } from "fastify";
import { requireRole } from "../../middleware/auth.js";
import {
  listTenants, getTenant, createTenant, updateTenant,
  listLocations, createLocation, updateLocation,
  listServices, createService, updateService, deleteService,
  listResources, createResource,
  getDashboardStats,
} from "./admin.service.js";

export async function adminRoutes(app: FastifyInstance) {
  // All admin routes require authentication + admin role
  app.addHook("preHandler", requireRole("admin", "superadmin"));

  // === Tenants ===
  app.get("/tenants", {
    schema: { tags: ["admin"], summary: "Alle Mandanten auflisten" },
    handler: async () => ({ data: await listTenants() }),
  });

  app.get("/tenants/:id", {
    schema: { tags: ["admin"], summary: "Mandant Details" },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return { data: await getTenant(id) };
    },
  });

  app.post("/tenants", {
    schema: { tags: ["admin"], summary: "Mandant erstellen" },
    handler: async (request, reply) => {
      const tenant = await createTenant(request.body as any);
      reply.code(201);
      return { data: tenant };
    },
  });

  app.put("/tenants/:id", {
    schema: { tags: ["admin"], summary: "Mandant aktualisieren" },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return { data: await updateTenant(id, request.body as any) };
    },
  });

  // === Locations ===
  app.get("/tenants/:tenantId/locations", {
    schema: { tags: ["admin"], summary: "Standorte eines Mandanten" },
    handler: async (request) => {
      const { tenantId } = request.params as { tenantId: string };
      return { data: await listLocations(tenantId) };
    },
  });

  app.post("/tenants/:tenantId/locations", {
    schema: { tags: ["admin"], summary: "Standort erstellen" },
    handler: async (request, reply) => {
      const { tenantId } = request.params as { tenantId: string };
      const location = await createLocation(tenantId, request.body as any);
      reply.code(201);
      return { data: location };
    },
  });

  app.put("/locations/:id", {
    schema: { tags: ["admin"], summary: "Standort aktualisieren" },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return { data: await updateLocation(id, request.body as any) };
    },
  });

  // === Services ===
  app.get("/tenants/:tenantId/services", {
    schema: { tags: ["admin"], summary: "Dienstleistungen eines Mandanten" },
    handler: async (request) => {
      const { tenantId } = request.params as { tenantId: string };
      return { data: await listServices(tenantId) };
    },
  });

  app.post("/tenants/:tenantId/services", {
    schema: { tags: ["admin"], summary: "Dienstleistung erstellen" },
    handler: async (request, reply) => {
      const { tenantId } = request.params as { tenantId: string };
      const service = await createService(tenantId, request.body as any);
      reply.code(201);
      return { data: service };
    },
  });

  app.put("/services/:id", {
    schema: { tags: ["admin"], summary: "Dienstleistung aktualisieren" },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return { data: await updateService(id, request.body as any) };
    },
  });

  app.delete("/services/:id", {
    schema: { tags: ["admin"], summary: "Dienstleistung deaktivieren" },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return { data: await deleteService(id) };
    },
  });

  // === Resources ===
  app.get("/tenants/:tenantId/resources", {
    schema: { tags: ["admin"], summary: "Ressourcen eines Mandanten" },
    handler: async (request) => {
      const { tenantId } = request.params as { tenantId: string };
      const locationId = (request.query as Record<string, string>).locationId;
      return { data: await listResources(tenantId, locationId) };
    },
  });

  app.post("/tenants/:tenantId/resources", {
    schema: { tags: ["admin"], summary: "Ressource erstellen" },
    handler: async (request, reply) => {
      const { tenantId } = request.params as { tenantId: string };
      const resource = await createResource(tenantId, request.body as any);
      reply.code(201);
      return { data: resource };
    },
  });

  // === Dashboard ===
  app.get("/tenants/:tenantId/dashboard", {
    schema: { tags: ["admin"], summary: "Dashboard-Statistiken" },
    handler: async (request) => {
      const { tenantId } = request.params as { tenantId: string };
      return { data: await getDashboardStats(tenantId) };
    },
  });
}
