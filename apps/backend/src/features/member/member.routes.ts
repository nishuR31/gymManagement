import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { MemberController, idParamsSchema, createMemberSchema, updateMemberSchema, listMembersQuerySchema, suspendBodySchema } from "./member.controller.js";
import { MemberSubscriptionController, assignSubscriptionSchema } from "../../features/membership/member-subscription.controller.js";
import { errors } from "../../core/errors/app-error.js";
import type { AttendanceService } from "../../features/attendance/attendance.service.js";
import type { MembershipService } from "../../features/membership/membership.service.js";
import type { MemberService } from "./member.service.js";
import type { PaymentService } from "../../features/payment/payment.service.js";
import type { RequestContext } from "../../core/types/auth.js";
import { sendSuccess } from "../../core/utils/response.js";

export interface MemberRoutesOptions {
  memberService: MemberService;
  attendanceService: AttendanceService;
  membershipService: MembershipService;
  paymentService: PaymentService;
}

const createInvoiceSchema = z.object({
  subscriptionId: z.string().min(1).optional(),
  amountDueCents: z.number().int().positive(),
  dueDate: z.coerce.date()
});

export async function memberRoutes(app: FastifyInstance, options: MemberRoutesOptions): Promise<void> {
  const controller = new MemberController(options.memberService);
  const subscriptionController = new MemberSubscriptionController(options.membershipService);
  const server = app.withTypeProvider<ZodTypeProvider>();

  app.addHook("preHandler", app.authenticate);

  server.get("/", { schema: { querystring: listMembersQuerySchema } }, controller.list);
  server.post("/", { schema: { body: createMemberSchema } }, controller.create);
  server.get("/me", controller.me);
  server.get("/expiring-soon", { schema: { querystring: z.object({ days: z.coerce.number().int().positive().max(120).default(30) }) } }, async (request) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const query = z
      .object({
        days: z.coerce.number().int().positive().max(120).default(30)
      })
      .parse(request.query);
    return { data: await options.membershipService.listExpiringSoon(query.days, request.actor) };
  });
  server.get("/:id", { schema: { params: idParamsSchema } }, controller.get);
  server.post("/:id/subscriptions", { schema: { params: idParamsSchema, body: assignSubscriptionSchema } }, subscriptionController.assign);
  server.get("/:id/subscriptions", { schema: { params: idParamsSchema } }, subscriptionController.list);
  server.post("/:id/invoices", { schema: { params: z.object({ id: z.string().min(1) }), body: createInvoiceSchema } }, async (request, reply) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = createInvoiceSchema.parse(request.body);
    const invoice = await options.paymentService.createInvoice(params.id, body, request.actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, { invoice });
  });
  server.get("/:id/payments", { schema: { params: z.object({ id: z.string().min(1) }) } }, async (request) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return options.paymentService.listMemberPayments(params.id, request.actor);
  });
  server.get("/:id/invoices", { schema: { params: z.object({ id: z.string().min(1) }) } }, async (request) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return options.paymentService.listMemberInvoices(params.id, request.actor);
  });
  server.post("/:id/subscriptions/:subId/freeze", { schema: { params: z.object({ id: z.string().min(1), subId: z.string().min(1) }) } }, subscriptionController.freeze);
  server.post("/:id/subscriptions/:subId/unfreeze", { schema: { params: z.object({ id: z.string().min(1), subId: z.string().min(1) }) } }, subscriptionController.unfreeze);
  server.post("/:id/subscriptions/:subId/cancel", { schema: { params: z.object({ id: z.string().min(1), subId: z.string().min(1) }) } }, subscriptionController.cancel);
  server.get("/:id/attendance", { schema: { params: z.object({ id: z.string().min(1) }), querystring: z.object({ page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().positive().max(100).default(20) }) } }, async (request) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().max(100).default(20)
      })
      .parse(request.query);
    return options.attendanceService.listMemberAttendance(params.id, query.page, query.pageSize, request.actor);
  });
  server.patch("/:id", { schema: { params: idParamsSchema, body: updateMemberSchema } }, controller.update);
  server.delete("/:id", { schema: { params: idParamsSchema } }, controller.archive);
  server.post("/:id/suspend", { schema: { params: idParamsSchema, body: suspendBodySchema } }, controller.suspend);
  server.post("/:id/restore", { schema: { params: idParamsSchema } }, controller.restore);
  server.get("/:id/qr", { schema: { params: idParamsSchema } }, controller.getQr);
  server.post("/:id/qr/regenerate", { schema: { params: idParamsSchema } }, controller.regenerateQr);
  server.post("/:id/login", { schema: { params: z.object({ id: z.string().min(1) }) } }, async (request, reply) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const login = await options.memberService.createOrRegenerateLogin(params.id, request.actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, { login });
  });
}

function getRequestContext(request: { ip?: string; headers: Record<string, string | string[] | undefined> }): RequestContext {
  return {
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(request.headers["user-agent"] ? { userAgent: String(request.headers["user-agent"]) } : {})
  };
}
