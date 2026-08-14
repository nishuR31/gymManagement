import "fastify";
import type { RequestActor, AccessTokenClaims } from "./auth.js";
import type { RoleName } from "@gym/shared";

declare module "fastify" {
  interface FastifyRequest {
    actor?: RequestActor;
    tokenClaims?: AccessTokenClaims;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
    authorize: (roles: readonly RoleName[]) => (request: FastifyRequest) => Promise<void>;
  }
}
