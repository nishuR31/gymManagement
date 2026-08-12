import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MemberController } from "../controllers/member.controller.js";
import { MemberSubscriptionController } from "../controllers/member-subscription.controller.js";
import { errors } from "../errors/app-error.js";
import type { AttendanceService } from "../services/attendance.service.js";
import type { MembershipService } from "../services/membership.service.js";
import type { MemberService } from "../services/member.service.js";
import type { PaymentService } from "../services/payment.service.js";
import type { RequestContext } from "../types/auth.js";

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

  app.addHook("preHandler", app.authenticate);

  app.get("/", controller.list);
  app.post("/", controller.create);
  app.get("/me", controller.me);
  app.get("/expiring-soon", async (request) => {
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
  app.get("/:id", controller.get);
  app.post("/:id/subscriptions", subscriptionController.assign);
  app.get("/:id/subscriptions", subscriptionController.list);
  app.post("/:id/invoices", async (request, reply) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = createInvoiceSchema.parse(request.body);
    const invoice = await options.paymentService.createInvoice(params.id, body, request.actor, getRequestContext(request));
    reply.status(201).send({ invoice });
  });
  app.get("/:id/payments", async (request) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return options.paymentService.listMemberPayments(params.id, request.actor);
  });
  app.get("/:id/invoices", async (request) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return options.paymentService.listMemberInvoices(params.id, request.actor);
  });
  app.post("/:id/subscriptions/:subId/freeze", subscriptionController.freeze);
  app.post("/:id/subscriptions/:subId/unfreeze", subscriptionController.unfreeze);
  app.post("/:id/subscriptions/:subId/cancel", subscriptionController.cancel);
  app.get("/:id/attendance", async (request) => {
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
  app.patch("/:id", controller.update);
  app.delete("/:id", controller.archive);
  app.post("/:id/suspend", controller.suspend);
  app.post("/:id/restore", controller.restore);
  app.get("/:id/qr", controller.getQr);
  app.post("/:id/qr/regenerate", controller.regenerateQr);
  app.post("/:id/login", async (request, reply) => {
    if (!request.actor) {
      throw errors.unauthorized();
    }

    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const login = await options.memberService.createOrRegenerateLogin(params.id, request.actor, getRequestContext(request));
    reply.status(201).send({ login });
  });
}

function getRequestContext(request: { ip?: string; headers: Record<string, string | string[] | undefined> }): RequestContext {
  return {
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(request.headers["user-agent"] ? { userAgent: String(request.headers["user-agent"]) } : {})
  };
}
