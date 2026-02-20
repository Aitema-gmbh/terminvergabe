/**
 * aitema|Termin - Auth Service
 * Keycloak OIDC Token Validation with JWKS Caching + Redis Session Cache
 */
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { createClient } from 'redis';

export interface UserSession {
  sub: string;
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
  iat: number;
  exp: number;
}

interface KeycloakTokenPayload extends JWTPayload {
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  tenant_id?: string;
  organization?: string;
}

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8180';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'terminvergabe';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SESSION_TTL = 300; // 5 minutes

// JWKS endpoint - jose caches internally
const JWKS_URI = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(JWKS_URI));
  }
  return jwks;
}

// Redis client (lazy connect)
let redis: ReturnType<typeof createClient> | null = null;

async function getRedis() {
  if (!redis) {
    redis = createClient({ url: REDIS_URL });
    redis.on('error', (err) => console.error('[auth] Redis error:', err));
    await redis.connect();
  }
  return redis;
}

function extractTenantId(payload: KeycloakTokenPayload): string {
  // Priority: tenant_id claim > organization claim > azp (client) > 'default'
  if (payload.tenant_id) return payload.tenant_id;
  if (payload.organization) return payload.organization;
  if (payload.azp) return payload.azp as string;
  return 'default';
}

function extractRoles(payload: KeycloakTokenPayload): string[] {
  const realmRoles = payload.realm_access?.roles ?? [];
  const clientRoles = Object.values(payload.resource_access ?? {})
    .flatMap((r) => r.roles ?? []);
  // Deduplicate
  return [...new Set([...realmRoles, ...clientRoles])];
}

export async function validateToken(token: string): Promise<UserSession> {
  // 1. Check Redis session cache
  const cacheKey = `session:${token.slice(-32)}`;
  try {
    const r = await getRedis();
    const cached = await r.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as UserSession;
    }
  } catch (err) {
    // Redis unavailable - continue without cache
    console.warn('[auth] Redis cache miss/error, validating token directly:', err);
  }

  // 2. Verify JWT signature + expiry via JWKS
  let payload: KeycloakTokenPayload;
  try {
    const result = await jwtVerify(token, getJWKS(), {
      issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
    });
    payload = result.payload as KeycloakTokenPayload;
  } catch (err) {
    throw new Error(`Token validation failed: ${(err as Error).message}`);
  }

  // 3. Build session object
  const session: UserSession = {
    sub: payload.sub ?? '',
    email: payload.email ?? payload.preferred_username ?? '',
    name: payload.name ?? payload.preferred_username ?? '',
    roles: extractRoles(payload),
    tenantId: extractTenantId(payload),
    iat: (payload.iat ?? 0) as number,
    exp: (payload.exp ?? 0) as number,
  };

  // 4. Store in Redis with TTL
  try {
    const r = await getRedis();
    await r.setEx(cacheKey, SESSION_TTL, JSON.stringify(session));
  } catch (err) {
    console.warn('[auth] Failed to cache session in Redis:', err);
  }

  return session;
}

export function hasRole(session: UserSession, role: string): boolean {
  return session.roles.includes(role);
}

export function hasAnyRole(session: UserSession, roles: string[]): boolean {
  return roles.some((r) => session.roles.includes(r));
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.disconnect();
    redis = null;
  }
}
