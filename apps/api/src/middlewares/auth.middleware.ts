import type { FastifyInstance } from "fastify";
import type { RoleName } from "@gym/shared";
import { errors } from "../errors/app-error.js";
import type { AuthRepository } from "../repositories/auth.repository.js";
import { TokenService } from "../services/token.service.js";

export interface AuthMiddlewareOptions {
  repository: AuthRepository;
  tokenService: TokenService;
}

export function registerAuthMiddleware(app: FastifyInstance, options: AuthMiddlewareOptions): void {
  app.decorate("authenticate", async (request) => {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw errors.unauthorized();
    }

    const token = authorization.slice("Bearer ".length);

    try {
      const claims = options.tokenService.verifyAccessToken(token);
      const user = await options.repository.findUserById(claims.sub);

      if (!user || !user.isActive) {
        throw errors.unauthorized();
      }

      request.tokenClaims = claims;
      request.actor = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      };
    } catch {
      throw errors.unauthorized();
    }
  });

  app.decorate("authorize", (roles: readonly RoleName[]) => {
    return async (request) => {
      await app.authenticate(request);

      if (!request.actor || !roles.includes(request.actor.role)) {
        throw errors.forbidden();
      }
    };
  });
}
