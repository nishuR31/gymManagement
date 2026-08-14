import type { FastifyInstance, FastifyRequest } from "fastify";
import { inquiryStatuses } from "@gym/shared";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { errors } from "../../core/errors/app-error.js";
import type { InquiryService } from "../../features/inquiry/inquiry.service.js";
import type { RequestContext } from "../../core/types/auth.js";
import { sendSuccess } from "../../core/utils/response.js";

export interface PublicRoutesOptions {
  inquiryService: InquiryService;
}

const emailSchema = z.string().email().trim().toLowerCase();

const createInquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  phone: z.string().trim().min(7).max(30),
  message: z.string().trim().min(10).max(4000)
});

const listQuerySchema = z.object({
  status: z.enum(inquiryStatuses).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50)
});

const idParamsSchema = z.object({ id: z.string().min(1) });

export async function publicRoutes(app: FastifyInstance, options: PublicRoutesOptions): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();
  app.withTypeProvider<ZodTypeProvider>().get("/plans", async () => options.inquiryService.publicPlans());

  server.post(
    "/inquiries",
    {
      config: {
        rateLimit: {
          max: 1,
          timeWindow: "10 minutes",
          hook: "preHandler",
          keyGenerator: (request: FastifyRequest) => {
            const body = request.body as { email?: unknown } | undefined;
            const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "unknown-email";
            return `${request.ip}:${email}`;
          }
        }
      },
      schema: { body: createInquirySchema }
    },
    async (request, reply) => {
      const body = createInquirySchema.parse(request.body);
      const inquiry = await options.inquiryService.createPublicInquiry(body);
      sendSuccess(reply, "Success", 201, { inquiry });
    }
  );
}

export async function inquiryRoutes(app: FastifyInstance, options: PublicRoutesOptions): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.withTypeProvider<ZodTypeProvider>().get("/", { schema: { querystring: listQuerySchema } }, async (request) => {
    const actor = requireActor(request);
    const query = listQuerySchema.parse(request.query);
    return options.inquiryService.list(query, actor);
  });

  app.withTypeProvider<ZodTypeProvider>().post("/:id/read", { schema: { params: idParamsSchema } }, async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    return { inquiry: await options.inquiryService.markRead(params.id, actor, getRequestContext(request)) };
  });

  app.withTypeProvider<ZodTypeProvider>().delete("/:id", { schema: { params: idParamsSchema } }, async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    return { inquiry: await options.inquiryService.delete(params.id, actor, getRequestContext(request)) };
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
