import type { FastifyInstance, FastifyRequest } from "fastify";
import { errors } from "../errors/app-error.js";
import type { DashboardService } from "../services/dashboard.service.js";

export interface DashboardRoutesOptions {
  dashboardService: DashboardService;
}

export async function dashboardRoutes(app: FastifyInstance, options: DashboardRoutesOptions): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.get("/summary", async (request) => options.dashboardService.summary(requireActor(request)));
}

function requireActor(request: FastifyRequest) {
  if (!request.actor) {
    throw errors.unauthorized();
  }
  return request.actor;
}
