import type { FastifyInstance, FastifyRequest } from "fastify";
import { paymentAnalyticsRanges, paymentMethods } from "@gym/shared";
import { z } from "zod";
import { errors } from "../errors/app-error.js";
import type { PaymentService } from "../services/payment.service.js";
import type { RequestContext } from "../types/auth.js";

export interface PaymentRoutesOptions {
  paymentService: PaymentService;
}

const idParamsSchema = z.object({
  id: z.string().min(1)
});

const recordPaymentSchema = z.object({
  amountCents: z.number().int().positive(),
  method: z.enum(paymentMethods),
  paidAt: z.coerce.date().optional()
});

const refundSchema = z.object({
  amountCents: z.number().int().positive(),
  reason: z.string().trim().min(1).max(1000),
  refundedAt: z.coerce.date().optional()
});

const analyticsQuerySchema = z.object({
  range: z.enum(paymentAnalyticsRanges)
});

export async function paymentRoutes(app: FastifyInstance, options: PaymentRoutesOptions): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.get("/analytics", async (request) => {
    const actor = requireActor(request);
    const query = analyticsQuerySchema.parse(request.query);
    return options.paymentService.getAnalytics(query.range, actor);
  });

  app.get("/pending-dues", async (request) => {
    const actor = requireActor(request);
    return options.paymentService.getPendingDues(actor);
  });

  app.post("/:id/refund", async (request, reply) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const body = refundSchema.parse(request.body);
    const invoice = await options.paymentService.refundPayment(params.id, body, actor, getRequestContext(request));
    reply.status(201).send({ invoice });
  });
}

export async function invoiceRoutes(app: FastifyInstance, options: PaymentRoutesOptions): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.get("/:id", async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    return { invoice: await options.paymentService.getInvoice(params.id, actor) };
  });

  app.post("/:id/payments", async (request, reply) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const body = recordPaymentSchema.parse(request.body);
    const invoice = await options.paymentService.recordPayment(params.id, body, actor, getRequestContext(request));
    reply.status(201).send({ invoice });
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
