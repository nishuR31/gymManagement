import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ error }, "request failed");

    if (error instanceof ZodError) {
      const response: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.flatten()
        }
      };
      reply.status(400).send(response);
      return;
    }

    if (error instanceof AppError) {
      const response: ErrorResponse = {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      };
      reply.status(error.statusCode).send(response);
      return;
    }

    if (error.statusCode === 429) {
      const response: ErrorResponse = {
        error: {
          code: "TOO_MANY_REQUESTS",
          message: error.message || "Too many requests"
        }
      };
      reply.status(429).send(response);
      return;
    }

    if (typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 500) {
      const response: ErrorResponse = {
        error: {
          code: "BAD_REQUEST",
          message: error.message || "Bad request"
        }
      };
      reply.status(error.statusCode).send(response);
      return;
    }

    const response: ErrorResponse = {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected server error"
      }
    };
    reply.status(500).send(response);
  });
}
