import { FastifyRequest, FastifyReply } from "fastify";
import * as jose from "jose";
import { getConfig } from "../config.js";

export interface AuthUser {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
  tenantId?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

let jwks: jose.JWTVerifyGetKey | null = null;

function getJwks(): jose.JWTVerifyGetKey {
  if (!jwks) {
    const config = getConfig();
    const issuer = `${config.KEYCLOAK_URL}/realms/${config.KEYCLOAK_REALM}`;
    jwks = jose.createRemoteJWKSet(
      new URL(`${issuer}/protocol/openid-connect/certs`)
    );
  }
  return jwks;
}

/**
 * Authentication guard - verifies Keycloak JWT token.
 * Attach as preHandler to protected routes.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const config = getConfig();
  const issuer = `${config.KEYCLOAK_URL}/realms/${config.KEYCLOAK_REALM}`;

  try {
    const { payload } = await jose.jwtVerify(token, getJwks(), {
      issuer,
      audience: config.KEYCLOAK_CLIENT_ID,
    });

    const realmRoles =
      (payload as Record<string, unknown>).realm_access &&
      typeof (payload as Record<string, unknown>).realm_access === "object"
        ? ((payload as Record<string, unknown>).realm_access as { roles?: string[] }).roles ?? []
        : [];

    request.user = {
      sub: payload.sub ?? "",
      email: (payload as Record<string, string>).email,
      name: (payload as Record<string, string>).preferred_username,
      roles: realmRoles,
      tenantId: (payload as Record<string, string>).tenant_id,
    };
  } catch (err) {
    request.log.warn({ err }, "JWT verification failed");
    reply.code(401).send({ error: "Invalid or expired token" });
  }
}

/**
 * Role-based authorization guard.
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await requireAuth(request, reply);
    if (reply.sent) return;

    const userRoles = request.user?.roles ?? [];
    const hasRole = roles.some((r) => userRoles.includes(r));

    if (!hasRole) {
      reply.code(403).send({ error: "Insufficient permissions" });
    }
  };
}
