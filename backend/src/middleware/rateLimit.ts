import { FastifyRequest, FastifyReply } from "fastify";
import { redis } from "../server.js";

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: FastifyRequest) => string;
  message?: string;
}

/**
 * Custom rate limiter using Redis sliding window.
 * Use for specific endpoints that need tighter limits than the global rate limit.
 */
export function customRateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip,
    message = "Too many requests, please try again later.",
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = `ratelimit:${keyGenerator(request)}`;
    const windowSec = Math.ceil(windowMs / 1000);

    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, windowSec);
    const results = await multi.exec();

    const currentCount = results?.[0]?.[1] as number;

    reply.header("X-RateLimit-Limit", maxRequests);
    reply.header("X-RateLimit-Remaining", Math.max(0, maxRequests - currentCount));

    if (currentCount > maxRequests) {
      reply.code(429).send({ error: message });
    }
  };
}

/**
 * Booking-specific rate limit: max 10 booking attempts per 15 minutes per IP.
 */
export const bookingRateLimit = customRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => `booking:${req.ip}`,
  message: "Zu viele Buchungsversuche. Bitte versuchen Sie es in 15 Minuten erneut.",
});
