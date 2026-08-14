import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../../core/errors/app-error.js";
import { sendError } from "../../core/utils/response.js";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error: any, request, reply) => {
    request.log.error({ error }, "request failed");

    if (error instanceof ZodError) {
      return sendError(reply, "Request validation failed", 400, {
        code: "VALIDATION_ERROR",
        details: error.issues
      });
    }

    if (error instanceof AppError) {
      return sendError(reply, error.message, error.statusCode, {
        code: error.code,
        details: error.details
      });
    }

    if (error.statusCode === 429) {
      return sendError(reply, error.message || "Too many requests", 429, {
        code: "RATE_LIMIT_EXCEEDED"
      });
    }

    if (typeof error.statusCode === "number" && error.statusCode >= 400 && error.statusCode < 500) {
      return sendError(reply, error.message || "Bad request", error.statusCode, {
        code: error.code || "CLIENT_ERROR"
      });
    }

    return sendError(reply, "Unexpected server error", 500, {
      code: "INTERNAL_SERVER_ERROR"
    });
  });
}
