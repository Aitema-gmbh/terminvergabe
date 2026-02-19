import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Keycloak
  KEYCLOAK_URL: z.string().default("http://localhost:8180"),
  KEYCLOAK_REALM: z.string().default("terminvergabe"),
  KEYCLOAK_CLIENT_ID: z.string().default("termin-backend"),
  KEYCLOAK_CLIENT_SECRET: z.string().default(""),

  // JWT
  JWT_SECRET: z.string().min(16),

  // SMTP
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default("noreply@termin.local"),

  // CORS
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:5174,http://localhost:5175"),
});

export type Config = z.infer<typeof envSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (\!_config) {
    const result = envSchema.safeParse(process.env);
    if (\!result.success) {
      console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
      process.exit(1);
    }
    _config = result.data;
  }
  return _config;
}

export function getCorsOrigins(): string[] {
  return getConfig().CORS_ORIGINS.split(",").map((s) => s.trim());
}
