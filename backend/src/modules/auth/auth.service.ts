import { getConfig } from "../../config.js";

const config = getConfig();

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Exchange authorization code for tokens via Keycloak.
 */
export async function exchangeAuthCode(
  code: string,
  redirectUri: string
): Promise<KeycloakTokenResponse> {
  const tokenUrl = `${config.KEYCLOAK_URL}/realms/${config.KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.KEYCLOAK_CLIENT_ID,
      client_secret: config.KEYCLOAK_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw { statusCode: 401, message: `Authentication failed: ${error}` };
  }

  return response.json() as Promise<KeycloakTokenResponse>;
}

/**
 * Refresh an access token.
 */
export async function refreshToken(
  refreshTokenStr: string
): Promise<KeycloakTokenResponse> {
  const tokenUrl = `${config.KEYCLOAK_URL}/realms/${config.KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshTokenStr,
      client_id: config.KEYCLOAK_CLIENT_ID,
      client_secret: config.KEYCLOAK_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw { statusCode: 401, message: "Token refresh failed" };
  }

  return response.json() as Promise<KeycloakTokenResponse>;
}

/**
 * Get the Keycloak login URL for authorization code flow.
 */
export function getLoginUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: config.KEYCLOAK_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
  });

  return `${config.KEYCLOAK_URL}/realms/${config.KEYCLOAK_REALM}/protocol/openid-connect/auth?${params}`;
}

/**
 * Get the Keycloak logout URL.
 */
export function getLogoutUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: config.KEYCLOAK_CLIENT_ID,
    post_logout_redirect_uri: redirectUri,
  });

  return `${config.KEYCLOAK_URL}/realms/${config.KEYCLOAK_REALM}/protocol/openid-connect/logout?${params}`;
}
