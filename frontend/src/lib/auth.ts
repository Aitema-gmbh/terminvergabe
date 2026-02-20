/**
 * aitema|Termin - SvelteKit Keycloak Auth Wrapper
 * PKCE Flow with automatic Token Refresh + Svelte Stores
 */
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { writable, derived, get } from 'svelte/store';

// ─── Config ──────────────────────────────────────────────────────────────────

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8180';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'terminvergabe';
const CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'termin-frontend';
const REDIRECT_URI = import.meta.env.VITE_KEYCLOAK_REDIRECT_URI
  || `${browser ? window.location.origin : ''}/staff/callback`;

const OIDC_BASE = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect`;

const REFRESH_BUFFER_SECONDS = 60;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  preferredUsername: string;
  roles: string[];
  tenantId: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

// ─── Store ───────────────────────────────────────────────────────────────────

function createAuthStore() {
  const _accessToken = writable<string | null>(null);
  const _refreshToken = writable<string | null>(null);
  const _user = writable<AuthUser | null>(null);
  const _loading = writable<boolean>(true);
  const _error = writable<string | null>(null);

  let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

  function parseJwtPayload(token: string): Record<string, unknown> {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch {
      return {};
    }
  }

  function tokenToUser(token: string): AuthUser {
    const p = parseJwtPayload(token) as {
      sub?: string;
      email?: string;
      name?: string;
      preferred_username?: string;
      realm_access?: { roles: string[] };
      resource_access?: Record<string, { roles: string[] }>;
      tenant_id?: string;
      azp?: string;
    };

    const realmRoles = p.realm_access?.roles ?? [];
    const clientRoles = Object.values(p.resource_access ?? {}).flatMap((r) => r.roles ?? []);
    const roles = [...new Set([...realmRoles, ...clientRoles])];

    return {
      sub: p.sub ?? '',
      email: p.email ?? '',
      name: p.name ?? p.preferred_username ?? '',
      preferredUsername: p.preferred_username ?? '',
      roles,
      tenantId: p.tenant_id ?? p.azp ?? 'default',
    };
  }

  function scheduleRefresh(expiresIn: number) {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    const delay = Math.max((expiresIn - REFRESH_BUFFER_SECONDS) * 1000, 5000);
    _refreshTimer = setTimeout(() => refreshTokens(), delay);
  }

  function storeTokens(tokens: TokenResponse) {
    if (!browser) return;
    sessionStorage.setItem('kc_access_token', tokens.access_token);
    sessionStorage.setItem('kc_refresh_token', tokens.refresh_token);
    sessionStorage.setItem('kc_id_token', tokens.id_token);
    _accessToken.set(tokens.access_token);
    _refreshToken.set(tokens.refresh_token);
    _user.set(tokenToUser(tokens.access_token));
    scheduleRefresh(tokens.expires_in);
  }

  function clearTokens() {
    if (!browser) return;
    sessionStorage.removeItem('kc_access_token');
    sessionStorage.removeItem('kc_refresh_token');
    sessionStorage.removeItem('kc_id_token');
    _accessToken.set(null);
    _refreshToken.set(null);
    _user.set(null);
    if (_refreshTimer) clearTimeout(_refreshTimer);
  }

  async function refreshTokens(): Promise<boolean> {
    const rt = get(_refreshToken);
    if (!rt) return false;
    try {
      const resp = await fetch(`${OIDC_BASE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          refresh_token: rt,
        }),
      });
      if (!resp.ok) { clearTokens(); return false; }
      storeTokens(await resp.json());
      return true;
    } catch {
      clearTokens();
      return false;
    }
  }

  // ─── PKCE Helpers ──────────────────────────────────────────────────────────

  function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async function initAuth() {
    if (!browser) { _loading.set(false); return; }

    const storedAccess = sessionStorage.getItem('kc_access_token');
    const storedRefresh = sessionStorage.getItem('kc_refresh_token');

    if (storedAccess && storedRefresh) {
      const payload = parseJwtPayload(storedAccess) as { exp?: number };
      const expiresIn = (payload.exp ?? 0) - Date.now() / 1000;

      if (expiresIn > REFRESH_BUFFER_SECONDS) {
        _accessToken.set(storedAccess);
        _refreshToken.set(storedRefresh);
        _user.set(tokenToUser(storedAccess));
        scheduleRefresh(expiresIn);
        _loading.set(false);
        return;
      }

      _refreshToken.set(storedRefresh);
      if (await refreshTokens()) { _loading.set(false); return; }
    }

    _loading.set(false);
  }

  async function login(redirectAfter?: string) {
    if (!browser) return;

    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = crypto.randomUUID();

    sessionStorage.setItem('kc_pkce_verifier', verifier);
    sessionStorage.setItem('kc_state', state);
    if (redirectAfter) sessionStorage.setItem('kc_redirect_after', redirectAfter);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });

    window.location.href = `${OIDC_BASE}/auth?${params}`;
  }

  async function handleCallback(code: string, state: string): Promise<string> {
    const savedState = sessionStorage.getItem('kc_state');
    const verifier = sessionStorage.getItem('kc_pkce_verifier');

    if (state !== savedState) throw new Error('State mismatch - possible CSRF');
    if (!verifier) throw new Error('PKCE verifier missing');

    const resp = await fetch(`${OIDC_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code,
        code_verifier: verifier,
      }),
    });

    if (!resp.ok) throw new Error(`Token exchange failed: ${await resp.text()}`);

    storeTokens(await resp.json());
    sessionStorage.removeItem('kc_pkce_verifier');
    sessionStorage.removeItem('kc_state');

    const redirectAfter = sessionStorage.getItem('kc_redirect_after') ?? '/staff';
    sessionStorage.removeItem('kc_redirect_after');
    return redirectAfter;
  }

  async function logout() {
    if (!browser) return;
    const idToken = sessionStorage.getItem('kc_id_token');
    clearTokens();

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      post_logout_redirect_uri: `${window.location.origin}/staff/login`,
    });
    if (idToken) params.set('id_token_hint', idToken);
    window.location.href = `${OIDC_BASE}/logout?${params}`;
  }

  async function getToken(): Promise<string | null> {
    const token = get(_accessToken);
    if (!token) return null;
    const payload = parseJwtPayload(token) as { exp?: number };
    const expiresIn = (payload.exp ?? 0) - Date.now() / 1000;
    if (expiresIn < REFRESH_BUFFER_SECONDS) {
      return (await refreshTokens()) ? get(_accessToken) : null;
    }
    return token;
  }

  return {
    isAuthenticated: derived(_user, ($user) => $user !== null),
    currentUser: { subscribe: _user.subscribe },
    isLoading: { subscribe: _loading.subscribe },
    authError: { subscribe: _error.subscribe },
    initAuth,
    login,
    logout,
    handleCallback,
    getToken,
  };
}

export const auth = createAuthStore();
export const { isAuthenticated, currentUser, isLoading, authError } = auth;
