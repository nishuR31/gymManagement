import type { FastifyInstance, FastifyRequest } from "fastify";
import { notificationCategories, notificationPriorities } from "@gym/shared";
import { z } from "zod";
import { errors } from "../errors/app-error.js";
import type { NotificationService } from "../services/notification.service.js";
import type { RequestContext } from "../types/auth.js";

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
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request) => {
    const actor = requireActor(request);
    const query = listQuerySchema.parse(request.query);
    return options.notificationService.list(query, actor);
  });

  app.get("/unread-count", async (request) => options.notificationService.unreadCount(requireActor(request)));

  app.post("/", async (request, reply) => {
    const actor = requireActor(request);
    const body = createSchema.parse(request.body);
    const notification = await options.notificationService.create(body, actor, getRequestContext(request));
    reply.status(201).send({ notification });
  });

  app.post("/:id/read", async (request) => {
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
