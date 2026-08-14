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


const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: emailSchema
});

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordSchema
});

const tokenSchema = z.object({
  token: z.string().length(6)
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


  app.post("/login/passkey/generate", async (request, reply) => {
    const body = z.object({ email: emailSchema }).parse(request.body);
    const optionsResult = await options.authService.generatePasskeyAuthentication(body.email);
    
    reply.setCookie("passkeyLoginChallenge", optionsResult.challenge, {
      httpOnly: true,
      secure: options.env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/auth/login/passkey"
    });
    
    return optionsResult;
  });

  app.post("/login/passkey/verify", async (request, reply) => {
    const expectedChallenge = request.cookies.passkeyLoginChallenge;
    if (!expectedChallenge) throw errors.badRequest("Missing passkey challenge");

    const email = (request.query as any).email || (request.body as any).email;
    if (!email) throw errors.badRequest("Missing email");

    const result = await options.authService.verifyPasskeyAuthentication(email, request.body as any, expectedChallenge, getRequestContext(request));
    
    reply.clearCookie("passkeyLoginChallenge", {
      httpOnly: true,
      secure: options.env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/auth/login/passkey"
    });

    setRefreshCookie(reply, result.tokens.refreshToken, options.env);
    reply.send({
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn
    });
  });

  app.post("/refresh", async (request, reply) => {
    const refreshToken = request.cookies.refreshToken || (request.headers["x-refresh-token"] as string);

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
    const refreshToken = request.cookies.refreshToken || (request.headers["x-refresh-token"] as string);
    await options.authService.logout(refreshToken, getRequestContext(request));
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

  app.patch("/me/profile", {
    preHandler: app.authenticate
  }, async (request) => {
    if (!request.actor) throw errors.unauthorized();
    const body = profileUpdateSchema.parse(request.body);
    const user = await options.authService.updateProfile(request.actor, body, getRequestContext(request));
    return { user };
  });

  app.post("/me/password", {
    preHandler: app.authenticate
  }, async (request, reply) => {
    if (!request.actor) throw errors.unauthorized();
    const body = changePasswordSchema.parse(request.body);
    await options.authService.changePassword(request.actor, body.currentPassword, body.newPassword, getRequestContext(request));
    reply.status(204).send();
  });

  app.post("/2fa/generate", {
    preHandler: app.authenticate
  }, async (request) => {
    if (!request.actor) throw errors.unauthorized();
    return await options.authService.generateTwoFactor(request.actor, getRequestContext(request));
  });

  app.post("/2fa/verify", {
    preHandler: app.authenticate
  }, async (request, reply) => {
    if (!request.actor) throw errors.unauthorized();
    const body = tokenSchema.parse(request.body);
    await options.authService.verifyTwoFactor(request.actor, body.token, getRequestContext(request));
    reply.status(204).send();
  });

  app.post("/2fa/disable", {
    preHandler: app.authenticate
  }, async (request, reply) => {
    if (!request.actor) throw errors.unauthorized();
    const body = tokenSchema.parse(request.body);
    await options.authService.disableTwoFactor(request.actor, body.token, getRequestContext(request));
    reply.status(204).send();
  });

  app.get("/passkeys", {
    preHandler: app.authenticate
  }, async (request) => {
    if (!request.actor) throw errors.unauthorized();
    return await options.authService.getPasskeys(request.actor);
  });

  app.post("/passkeys/generate-registration", {
    preHandler: app.authenticate
  }, async (request, reply) => {
    if (!request.actor) throw errors.unauthorized();
    const optionsResult = await options.authService.generatePasskeyRegistration(request.actor);
    
    // Store challenge in session cookie (in a real app, use a dedicated session store)
    reply.setCookie("passkeyChallenge", optionsResult.challenge, {
      httpOnly: true,
      secure: options.env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/auth/passkeys"
    });
    
    return optionsResult;
  });

  app.post("/passkeys/verify-registration", {
    preHandler: app.authenticate
  }, async (request, reply) => {
    if (!request.actor) throw errors.unauthorized();
    const expectedChallenge = request.cookies.passkeyChallenge;
    if (!expectedChallenge) throw errors.badRequest("Missing passkey challenge");

    await options.authService.verifyPasskeyRegistration(request.actor, request.body as any, expectedChallenge, getRequestContext(request));
    
    reply.clearCookie("passkeyChallenge", {
      httpOnly: true,
      secure: options.env.COOKIE_SECURE,
      sameSite: "lax",
      path: "/auth/passkeys"
    });
    
    reply.status(204).send();
  });

  app.delete("/passkeys/:id", {
    preHandler: app.authenticate
  }, async (request, reply) => {
    if (!request.actor) throw errors.unauthorized();
    const params = z.object({ id: z.string() }).parse(request.params);
    await options.authService.removePasskey(request.actor, params.id, getRequestContext(request));
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
