/**
 * aitema|Termin - Auth Middleware (Fastify Plugin)
 * Bearer Token Validation + RBAC Route Guards
 */
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { validateToken, hasAnyRole, UserSession } from '../services/auth.service';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    user: UserSession | null;
    tenantId: string | null;
  }
}

// RBAC route prefix -> minimum required roles (any of these satisfies)
const ROUTE_ROLES: Array<{ prefix: RegExp; roles: string[] }> = [
  { prefix: /^\/admin\//,   roles: ['admin'] },
  { prefix: /^\/staff\//,   roles: ['admin', 'standortleiter', 'sachbearbeiter'] },
  { prefix: /^\/display\//, roles: ['admin', 'standortleiter', 'sachbearbeiter', 'display'] },
];

function getRequiredRoles(path: string): string[] | null {
  for (const entry of ROUTE_ROLES) {
    if (entry.prefix.test(path)) {
      return entry.roles;
    }
  }
  return null; // public route
}

function extractBearer(request: FastifyRequest): string | null {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorate request with user + tenantId
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('tenantId', null);

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const token = extractBearer(request);
    const requiredRoles = getRequiredRoles(request.routeOptions?.url ?? request.url);

    // Public routes: no token needed
    if (requiredRoles === null) {
      return;
    }

    // Protected routes: token required
    if (!token) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Bearer token required',
      });
    }

    // Validate token
    let session: UserSession;
    try {
      session = await validateToken(token);
    } catch (err) {
      request.log.warn({ err }, 'Token validation failed');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Attach to request
    request.user = session;
    request.tenantId = session.tenantId;

    // RBAC check
    if (!hasAnyRole(session, requiredRoles)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Requires one of: ${requiredRoles.join(', ')}`,
      });
    }
  });
};

export const authMiddleware = fp(authPlugin, {
  name: 'auth-middleware',
  fastify: '4.x',
});
