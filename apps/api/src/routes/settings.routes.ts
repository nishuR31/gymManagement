import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { errors } from "../errors/app-error.js";
import type { SettingsService } from "../services/settings.service.js";
import type { RequestContext } from "../types/auth.js";

export interface SettingsRoutesOptions {
  settingsService: SettingsService;
}

const keyParamsSchema = z.object({ key: z.string().trim().min(1).max(120) });
const updateSchema = z.object({ value: z.unknown() });

export async function settingsRoutes(app: FastifyInstance, options: SettingsRoutesOptions): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.get("/", async (request) => options.settingsService.list(requireActor(request)));

  app.get("/gym-info", async (request) => options.settingsService.gymInfo(requireActor(request)));

  app.get("/:key", async (request) => {
    const actor = requireActor(request);
    const params = keyParamsSchema.parse(request.params);
    return { setting: await options.settingsService.get(params.key, actor) };
  });

  app.put("/:key", async (request) => {
    const actor = requireActor(request);
    const params = keyParamsSchema.parse(request.params);
    const body = updateSchema.parse(request.body);
    return { setting: await options.settingsService.update(params.key, body.value, actor, getRequestContext(request)) };
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
