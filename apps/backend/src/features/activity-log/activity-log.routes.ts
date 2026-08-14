import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { errors } from "../../core/errors/app-error.js";
import type { ActivityLogService } from "./activity-log.service.js";

export interface ActivityLogRoutesOptions {
  activityLogService: ActivityLogService;
}

const querySchema = z.object({
  userId: z.string().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  entity: z.string().trim().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50)
});

export async function activityLogRoutes(app: FastifyInstance, options: ActivityLogRoutesOptions): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();
  app.addHook("preHandler", app.authenticate);

  server.get("/", { schema: { querystring: querySchema } }, async (request) => {
    const actor = requireActor(request);
    const query = querySchema.parse(request.query);
    return options.activityLogService.list(query, actor);
  });
}

function requireActor(request: FastifyRequest) {
  if (!request.actor) {
    throw errors.unauthorized();
  }
  return request.actor;
}
