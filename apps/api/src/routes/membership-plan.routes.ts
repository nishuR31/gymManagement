import type { FastifyInstance } from "fastify";
import { MembershipPlanController } from "../controllers/membership-plan.controller.js";
import type { MembershipService } from "../services/membership.service.js";

export interface MembershipPlanRoutesOptions {
  membershipService: MembershipService;
}

export async function membershipPlanRoutes(app: FastifyInstance, options: MembershipPlanRoutesOptions): Promise<void> {
  const controller = new MembershipPlanController(options.membershipService);

  app.addHook("preHandler", app.authenticate);

  app.post("/", controller.create);
  app.get("/", controller.list);
  app.patch("/:id", controller.update);
  app.post("/:id/deactivate", controller.deactivate);
}
