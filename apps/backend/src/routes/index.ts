import type { FastifyInstance } from "fastify";

import { authRoutes } from "../features/auth/auth.routes.js";
import { memberRoutes } from "../features/member/member.routes.js";
import { attendanceRoutes } from "../features/attendance/attendance.routes.js";
import { dashboardRoutes } from "../features/dashboard/dashboard.routes.js";
import { inventoryRoutes } from "../features/inventory/inventory.routes.js";
import { paymentRoutes } from "../features/payment/payment.routes.js";
import { invoiceRoutes } from "../features/payment/payment.routes.js";
import { membershipPlanRoutes } from "../features/membership/membership-plan.routes.js";
import { planRoutes } from "../features/membership/plan.routes.js";
import { staffRoutes } from "../features/staff/staff.routes.js";
import { settingsRoutes } from "../features/settings/settings.routes.js";
import { publicRoutes, inquiryRoutes } from "../features/public/public.routes.js";
import { notificationRoutes } from "../features/notification/notification.routes.js";
import { activityLogRoutes } from "../features/activity-log/activity-log.routes.js";
import { productOrderRoutes } from "../features/product-order/product-order.routes.js";
import { reportRoutes } from "../features/report/report.routes.js";

// We receive `options` from server.ts which contains all the initialized services
export async function registerRoutes(app: FastifyInstance, options: any): Promise<void> {
  app.get("/", async () => ({ status: "server up" }));
  app.get("/ping", async (request, reply) => reply.status(200).send({ status: "pong" }));
  app.get("/health", async (request, reply) => reply.status(200).send({ status: "healthy" }));

  await app.register(publicRoutes, {
    prefix: "/public",
    inquiryService: options.inquiryService
  });

  await app.register(authRoutes, {
    prefix: "/auth",
    authService: options.authService,
    env: options.env
  });

  await app.register(memberRoutes, {
    prefix: "/members",
    memberService: options.memberService,
    attendanceService: options.attendanceService,
    membershipService: options.membershipService,
    paymentService: options.paymentService
  });

  await app.register(membershipPlanRoutes, {
    prefix: "/membership-plans",
    membershipService: options.membershipService
  });

  await app.register(attendanceRoutes, {
    prefix: "/attendance",
    attendanceService: options.attendanceService
  });

  await app.register(invoiceRoutes, {
    prefix: "/invoices",
    paymentService: options.paymentService
  });

  await app.register(paymentRoutes, {
    prefix: "/payments",
    paymentService: options.paymentService
  });

  await app.register(inventoryRoutes, {
    prefix: "/inventory",
    inventoryService: options.inventoryService
  });

  await app.register(productOrderRoutes, {
    prefix: "/orders",
    productOrderService: options.productOrderService
  });

  await app.register(staffRoutes, {
    prefix: "/staff",
    staffService: options.staffService
  });

  await app.register(planRoutes, {
    prefix: "/plans",
    staffService: options.staffService
  });

  await app.register(activityLogRoutes, {
    prefix: "/activity-logs",
    activityLogService: options.activityLogService
  });

  await app.register(notificationRoutes, {
    prefix: "/notifications",
    notificationService: options.notificationService
  });

  await app.register(settingsRoutes, {
    prefix: "/settings",
    settingsService: options.settingsService
  });

  await app.register(inquiryRoutes, {
    prefix: "/inquiries",
    inquiryService: options.inquiryService
  });

  await app.register(reportRoutes, {
    prefix: "/reports",
    reportService: options.reportService
  });

  await app.register(dashboardRoutes, {
    prefix: "/dashboard",
    dashboardService: options.dashboardService
  });
}
