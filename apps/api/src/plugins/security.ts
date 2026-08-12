import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { Redis } from "ioredis";
import type { Env } from "../config/env.js";

export interface SecurityOptions {
  env: Env;
  enableRateLimit?: boolean;
}

export async function registerSecurity(app: FastifyInstance, options: SecurityOptions): Promise<void> {
  await app.register(helmet);
  await app.register(cors, {
    credentials: true,
    origin: parseCorsOrigins(options.env.CORS_ORIGIN)
  });
  await app.register(cookie);

  if (options.enableRateLimit === false) {
    return;
  }

  if (options.env.NODE_ENV === "test") {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute"
    });
    return;
  }

  const redis = new Redis(options.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });

  app.addHook("onClose", async () => {
    redis.disconnect();
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    redis
  });
}

function parseCorsOrigins(value: string): string | string[] {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length === 1 ? origins[0] ?? value : origins;
}
