import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { RoleName } from "@gym/shared";
import { roleNames } from "@gym/shared";
import type { Env } from "../config/env.js";
import { errors } from "../errors/app-error.js";
import type { AuthService } from "../services/auth.service.js";
import type { RequestContext } from "../types/auth.js";

const emailSchema = z.string().email().trim().toLowerCase();
const passwordSchema = z.string().min(8).max(128);

const loginBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  role: z.enum(roleNames)
});

const passwordResetRequestBodySchema = z.object({
  email: emailSchema
});

const passwordResetConfirmBodySchema = z.object({
  token: z.string().min(20),
  newPassword: passwordSchema
});

export interface AuthRoutesOptions {
  authService: AuthService;
  env: Env;
}

export async function authRoutes(app: FastifyInstance, options: AuthRoutesOptions): Promise<void> {
  app.post("/register", {
    preHandler: app.authorize(["SUPER_ADMIN", "GYM_OWNER", "ADMIN"])
  }, async (request, reply) => {
    const body = registerBodySchema.parse(request.body);

    if (!request.actor) {
      throw errors.unauthorized();
    }

    const user = await options.authService.register(body, request.actor, getRequestContext(request));
    reply.status(201).send({ user });
  });

  app.post("/login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const result = await options.authService.login(body.email, body.password, getRequestContext(request));
    setRefreshCookie(reply, result.tokens.refreshToken, options.env);
    reply.send({
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn
    });
  });

  app.post("/member-login", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute"
      }
    }
  }, async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const result = await options.authService.memberLogin(body.email, body.password, getRequestContext(request));
    setRefreshCookie(reply, result.tokens.refreshToken, options.env);
    reply.send({
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn
    });
  });

  app.post("/refresh", async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      throw errors.unauthorized("Refresh token missing");
    }

    const result = await options.authService.refresh(refreshToken, getRequestContext(request));
    setRefreshCookie(reply, result.tokens.refreshToken, options.env);
    reply.send({
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn
    });
  });

  app.post("/logout", async (request, reply) => {
    await options.authService.logout(request.cookies.refreshToken, getRequestContext(request));
    clearRefreshCookie(reply, options.env);
    reply.status(204).send();
  });

  app.get("/me", {
    preHandler: app.authenticate
  }, async (request) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    return { user: await options.authService.me(request.actor) };
  });

  app.post("/password-reset/request", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: "1 minute"
      }
    }
  }, async (request) => {
    const body = passwordResetRequestBodySchema.parse(request.body);
    const result = await options.authService.requestPasswordReset(body.email, getRequestContext(request));
    return {
      message: "If an active account exists for that email, a reset link will be sent.",
      ...result
    };
  });

  app.post("/password-reset/confirm", async (request, reply) => {
    const body = passwordResetConfirmBodySchema.parse(request.body);
    await options.authService.confirmPasswordReset(body.token, body.newPassword, getRequestContext(request));
    reply.status(204).send();
  });

  app.post("/first-password", {
    preHandler: app.authenticate
  }, async (request, reply) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const body = z.object({ newPassword: passwordSchema }).parse(request.body);
    const result = await options.authService.completeFirstPassword(request.actor, body.newPassword, getRequestContext(request));
    setRefreshCookie(reply, result.tokens.refreshToken, options.env);
    reply.send({
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn
    });
  });
}

function setRefreshCookie(reply: FastifyReply, token: string, env: Env): void {
  reply.setCookie("refreshToken", token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
  });
}

function clearRefreshCookie(reply: FastifyReply, env: Env): void {
  reply.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/auth"
  });
}

function getRequestContext(request: FastifyRequest): RequestContext {
  return {
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
  };
}
