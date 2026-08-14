import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { notificationCategories, notificationPriorities } from "@gym/shared";
import { z } from "zod";
import { errors } from "../../core/errors/app-error.js";
import type { NotificationService } from "./notification.service.js";
import type { RequestContext } from "../../core/types/auth.js";
import { sendSuccess } from "../../core/utils/response.js";

export interface NotificationRoutesOptions {
  notificationService: NotificationService;
}

const createSchema = z.object({
  userId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  category: z.enum(notificationCategories),
  priority: z.enum(notificationPriorities).default("NORMAL")
});

const listQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

const idParamsSchema = z.object({ id: z.string().min(1) });

export async function notificationRoutes(app: FastifyInstance, options: NotificationRoutesOptions): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();
  app.addHook("preHandler", app.authenticate);

  server.get("/", { schema: { querystring: listQuerySchema } }, async (request) => {
    const actor = requireActor(request);
    const query = listQuerySchema.parse(request.query);
    return options.notificationService.list(query, actor);
  });

  server.get("/unread-count", async (request) => options.notificationService.unreadCount(requireActor(request)));

  server.post("/", { schema: { body: createSchema } }, async (request, reply) => {
    const actor = requireActor(request);
    const body = createSchema.parse(request.body);
    const notification = await options.notificationService.create(body, actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, { notification });
  });

  server.post("/:id/read", { schema: { params: idParamsSchema } }, async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    return { notification: await options.notificationService.markRead(params.id, actor, getRequestContext(request)) };
  });
}

function requireActor(request: FastifyRequest) {
  if (!request.actor) {
    throw errors.unauthorized();
  }
  return request.actor;
}

function getRequestContext(request: FastifyRequest): RequestContext {
  return {
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
  };
}
