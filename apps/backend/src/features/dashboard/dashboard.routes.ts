import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { errors } from "../../core/errors/app-error.js";
import type { DashboardService } from "./dashboard.service.js";

export interface DashboardRoutesOptions {
  dashboardService: DashboardService;
}

export async function dashboardRoutes(app: FastifyInstance, options: DashboardRoutesOptions): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();
  app.addHook("preHandler", app.authenticate);

  server.get("/summary", async (request) => options.dashboardService.summary(requireActor(request)));
}

function requireActor(request: FastifyRequest) {
  if (!request.actor) {
    throw errors.unauthorized();
  }
  return request.actor;
}
