import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { MembershipPlanController, idParamsSchema, createPlanSchema, updatePlanSchema, listPlansQuerySchema } from "./membership-plan.controller.js";
import type { MembershipService } from "./membership.service.js";

export interface MembershipPlanRoutesOptions {
  membershipService: MembershipService;
}

export async function membershipPlanRoutes(app: FastifyInstance, options: MembershipPlanRoutesOptions): Promise<void> {
  const controller = new MembershipPlanController(options.membershipService);
  const server = app.withTypeProvider<ZodTypeProvider>();

  app.addHook("preHandler", app.authenticate);

  server.post("/", { schema: { body: createPlanSchema } }, controller.create);
  server.get("/", { schema: { querystring: listPlansQuerySchema } }, controller.list);
  server.patch("/:id", { schema: { params: idParamsSchema, body: updatePlanSchema } }, controller.update);
  server.post("/:id/deactivate", { schema: { params: idParamsSchema } }, controller.deactivate);
}
