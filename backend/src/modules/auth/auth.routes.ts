import { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { exchangeAuthCode, refreshToken, getLoginUrl, getLogoutUrl } from "./auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  /**
   * GET /api/auth/login
   * Redirect to Keycloak login page.
   */
  app.get("/login", {
    schema: { tags: ["auth"], summary: "Login via Keycloak" },
    handler: async (request, reply) => {
      const query = request.query as Record<string, string>;
      const redirectUri = query.redirect_uri || `${request.protocol}://${request.hostname}/api/auth/callback`;
      const state = nanoid();

      // Store state in cookie for CSRF protection
      reply.setCookie("auth_state", state, {
        httpOnly: true,
        secure: request.protocol === "https",
        sameSite: "lax",
        maxAge: 300,
        path: "/",
      });

      const loginUrl = getLoginUrl(redirectUri, state);
      reply.redirect(302, loginUrl);
    },
  });

  /**
   * GET /api/auth/callback
   * Handle Keycloak callback after login.
   */
  app.get("/callback", {
    schema: { tags: ["auth"], summary: "Keycloak Callback" },
    handler: async (request, reply) => {
      const query = request.query as Record<string, string>;
      const { code, state } = query;

      // Verify CSRF state
      const storedState = request.cookies.auth_state;
      if (!storedState || storedState !== state) {
        reply.code(403).send({ error: "Invalid state parameter" });
        return;
      }

      const redirectUri = `${request.protocol}://${request.hostname}/api/auth/callback`;
      const tokens = await exchangeAuthCode(code, redirectUri);

      // Set tokens in httpOnly cookies
      reply.setCookie("access_token", tokens.access_token, {
        httpOnly: true,
        secure: request.protocol === "https",
        sameSite: "lax",
        maxAge: tokens.expires_in,
        path: "/",
      });

      reply.setCookie("refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: request.protocol === "https",
        sameSite: "lax",
        maxAge: 86400 * 30,
        path: "/api/auth",
      });

      // Clear state cookie
      reply.clearCookie("auth_state", { path: "/" });

      // Redirect to frontend
      const frontendUrl = query.frontend_url || "/";
      reply.redirect(302, frontendUrl);
    },
  });

  /**
   * POST /api/auth/refresh
   * Refresh the access token.
   */
  app.post("/refresh", {
    schema: { tags: ["auth"], summary: "Token erneuern" },
    handler: async (request, reply) => {
      const refreshTokenValue = request.cookies.refresh_token;
      if (!refreshTokenValue) {
        reply.code(401).send({ error: "No refresh token" });
        return;
      }

      const tokens = await refreshToken(refreshTokenValue);

      reply.setCookie("access_token", tokens.access_token, {
        httpOnly: true,
        secure: request.protocol === "https",
        sameSite: "lax",
        maxAge: tokens.expires_in,
        path: "/",
      });

      return { success: true, expiresIn: tokens.expires_in };
    },
  });

  /**
   * POST /api/auth/logout
   * Logout and clear tokens.
   */
  app.post("/logout", {
    schema: { tags: ["auth"], summary: "Abmelden" },
    handler: async (request, reply) => {
      reply.clearCookie("access_token", { path: "/" });
      reply.clearCookie("refresh_token", { path: "/api/auth" });

      const redirectUri = (request.query as Record<string, string>).redirect_uri || "/";
      const logoutUrl = getLogoutUrl(redirectUri);

      return { logoutUrl };
    },
  });
}
