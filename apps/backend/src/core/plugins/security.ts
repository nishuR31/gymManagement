import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import etag from "@fastify/etag";
import multipart from "@fastify/multipart";
import formbody from "@fastify/formbody";
import type { FastifyInstance } from "fastify";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import { Redis } from "ioredis";
import type { Env } from "../../core/config/env.js";

export interface SecurityOptions {
  env: Env;
  enableRateLimit?: boolean;
  redisClient?: Redis | null;
}

export async function registerSecurity(app: FastifyInstance, options: SecurityOptions): Promise<void> {
  await app.register(helmet);
  await app.register(etag);
  await app.register(multipart, { attachFieldsToBody: true });
  await app.register(formbody);

  await app.register(swagger, {
    transform: jsonSchemaTransform,
    openapi: {
      info: {
        title: "Valor API",
        description: "API documentation for Valor GymOS",
        version: "0.1.0"
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true
    }
  });
  await app.register(cors, {
    credentials: true,
    origin: parseCorsOrigins(options.env.CORS_ORIGIN)
  });
  await app.register(cookie);

  if (options.enableRateLimit === false) {
    return;
  }

  if (options.env.NODE_ENV === "test" || !options.redisClient) {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute"
    });
    return;
  }

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    redis: options.redisClient
  });
}

function parseCorsOrigins(value: string): string | string[] {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length === 1 ? origins[0] ?? value : origins;
}
