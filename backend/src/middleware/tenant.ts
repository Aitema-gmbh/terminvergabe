import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../server.js";
import { redis } from "../server.js";

declare module "fastify" {
  interface FastifyRequest {
    tenantId?: string;
    tenantSlug?: string;
  }
}

const TENANT_CACHE_TTL = 300; // 5 minutes

/**
 * Middleware that resolves tenant from URL params or header.
 * Skips for routes that dont need tenant context (health, auth, admin, docs).
 */
export async function tenantMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const url = request.url;

  // Skip tenant resolution for certain routes
  if (
    url === "/health" ||
    url.startsWith("/docs") ||
    url.startsWith("/api/auth") ||
    url.startsWith("/api/v1/admin")
  ) {
    return;
  }

  // Extract tenant slug from URL params
  const params = request.params as Record<string, string>;
  const tenantSlug = params.tenantSlug;

  if (\!tenantSlug) {
    return;
  }

  // Check cache first
  const cacheKey = `tenant:${tenantSlug}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    const tenant = JSON.parse(cached);
    request.tenantId = tenant.id;
    request.tenantSlug = tenant.slug;
    return;
  }

  // Lookup in database
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, active: true },
    select: { id: true, slug: true },
  });

  if (\!tenant) {
    throw { statusCode: 404, message: `Tenant "${tenantSlug}" not found` };
  }

  // Cache the result
  await redis.set(cacheKey, JSON.stringify(tenant), "EX", TENANT_CACHE_TTL);

  request.tenantId = tenant.id;
  request.tenantSlug = tenant.slug;
}
