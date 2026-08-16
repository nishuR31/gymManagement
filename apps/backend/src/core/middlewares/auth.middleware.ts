import type { FastifyInstance } from "fastify";
import type { RoleName } from "@gym/shared";
import { errors } from "../../core/errors/app-error.js";
import type { AuthRepository } from "../../features/auth/auth.repository.js";
import { TokenService } from "../../features/auth/token.service.js";

export interface AuthMiddlewareOptions {
  repository: AuthRepository;
  tokenService: TokenService;
}

/**
 * Registers authenticate / authorize decorators on the Fastify instance.
 *
 * authenticate() now derives the actor entirely from verified JWT claims,
 * eliminating the per-request Postgres lookup that was previously blocking
 * every authenticated route. The JWT carries sub, email, and role — enough
 * for authorization decisions and as an actor ID for service calls that
 * fetch fresh data themselves.
 *
 * Trade-off: if a user is deactivated or their role changes, their existing
 * access token remains valid until it expires (default 15 min). This is
 * standard stateless-JWT behaviour. If immediate revocation is required,
 * a Redis session check should be layered in here.
 */
export function registerAuthMiddleware(app: FastifyInstance, options: AuthMiddlewareOptions): void {
  app.decorate("authenticate", async (request) => {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw errors.unauthorized();
    }

    const token = authorization.slice("Bearer ".length);

    try {
      const claims = options.tokenService.verifyAccessToken(token);

      request.tokenClaims = claims;

      // Build the actor from JWT claims — no DB round-trip.
      // Services that need live user state (me(), changePassword(), etc.)
      // fetch it themselves via the repository using actor.id.
      request.actor = {
        id: claims.sub,
        email: claims.email,
        role: claims.role,
        // The fields below are not in the JWT. They default to the safest
        // values for middleware-level decisions; route handlers that genuinely
        // need current values will re-fetch from the DB.
        firstName: "",
        lastName: "",
        mustChangePassword: false,
        twoFactorEnabled: false,
        hasPasskeys: false,
        securityDisableRequested: false
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
