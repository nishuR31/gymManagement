import Fastify, { type FastifyInstance } from "fastify";
import { loadEnv, type Env } from "./config/env.js";
import { registerAuthMiddleware } from "./middlewares/auth.middleware.js";
import { registerAttendanceAutoCheckoutJob } from "./plugins/attendance-auto-checkout.js";
import { registerMembershipExpiryJob } from "./plugins/membership-expiry.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { prisma } from "./plugins/prisma.js";
import { registerSecurity } from "./plugins/security.js";
import { PrismaAttendanceRepository, type AttendanceRepository } from "./repositories/attendance.repository.js";
import { PrismaMembershipRepository, type MembershipRepository } from "./repositories/membership.repository.js";
import { PrismaMemberRepository, type MemberRepository } from "./repositories/member.repository.js";
import { PrismaPaymentRepository, type PaymentRepository } from "./repositories/payment.repository.js";
import { PrismaInventoryRepository, type InventoryRepository } from "./repositories/inventory.repository.js";
import { PrismaProductOrderRepository, type ProductOrderRepository } from "./repositories/product-order.repository.js";
import { PrismaStaffRepository, type StaffRepository } from "./repositories/staff.repository.js";
import { PrismaActivityLogRepository, type ActivityLogRepository } from "./repositories/activity-log.repository.js";
import { PrismaNotificationRepository, type NotificationRepository } from "./repositories/notification.repository.js";
import { PrismaReportRepository, type ReportRepository } from "./repositories/report.repository.js";
import { PrismaSettingsRepository, type SettingsRepository } from "./repositories/settings.repository.js";
import { PrismaInquiryRepository, type InquiryRepository } from "./repositories/inquiry.repository.js";
import { PrismaAuthRepository, type AuthRepository } from "./repositories/auth.repository.js";
import { NullAttendanceAggregateCache, RedisAttendanceAggregateCache, type AttendanceAggregateCache } from "./services/attendance-cache.service.js";
import { NullPaymentAnalyticsCache, RedisPaymentAnalyticsCache, type PaymentAnalyticsCache } from "./services/payment-cache.service.js";
import { NullInventoryAggregateCache, RedisInventoryAggregateCache, type InventoryAggregateCache } from "./services/inventory-cache.service.js";
import { NullAggregateCache, RedisAggregateCache, type AggregateCache } from "./services/aggregate-cache.service.js";
import { attendanceRoutes } from "./routes/attendance.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { memberRoutes } from "./routes/member.routes.js";
import { membershipPlanRoutes } from "./routes/membership-plan.routes.js";
import { invoiceRoutes, paymentRoutes } from "./routes/payment.routes.js";
import { inventoryRoutes } from "./routes/inventory.routes.js";
import { productOrderRoutes } from "./routes/product-order.routes.js";
import { staffRoutes } from "./routes/staff.routes.js";
import { planRoutes } from "./routes/plan.routes.js";
import { activityLogRoutes } from "./routes/activity-log.routes.js";
import { dashboardRoutes } from "./routes/dashboard.routes.js";
import { notificationRoutes } from "./routes/notification.routes.js";
import { reportRoutes } from "./routes/report.routes.js";
import { settingsRoutes } from "./routes/settings.routes.js";
import { inquiryRoutes, publicRoutes } from "./routes/public.routes.js";
import { AttendanceService } from "./services/attendance.service.js";
import { AuthService } from "./services/auth.service.js";
import { MembershipService } from "./services/membership.service.js";
import { MemberService } from "./services/member.service.js";
import { PaymentService } from "./services/payment.service.js";
import { InventoryService } from "./services/inventory.service.js";
import { ProductOrderService } from "./services/product-order.service.js";
import { StaffService } from "./services/staff.service.js";
import { ActivityLogService } from "./services/activity-log.service.js";
import { DashboardService } from "./services/dashboard.service.js";
import { NotificationService } from "./services/notification.service.js";
import { ReportService } from "./services/report.service.js";
import { SettingsService } from "./services/settings.service.js";
import { InquiryService } from "./services/inquiry.service.js";
import { TokenService } from "./services/token.service.js";

export interface BuildAppOptions {
  env?: Env;
  authRepository?: AuthRepository;
  memberRepository?: MemberRepository;
  attendanceRepository?: AttendanceRepository;
  membershipRepository?: MembershipRepository;
  paymentRepository?: PaymentRepository;
  inventoryRepository?: InventoryRepository;
  productOrderRepository?: ProductOrderRepository;
  staffRepository?: StaffRepository;
  activityLogRepository?: ActivityLogRepository;
  notificationRepository?: NotificationRepository;
  reportRepository?: ReportRepository;
  settingsRepository?: SettingsRepository;
  inquiryRepository?: InquiryRepository;
  attendanceCache?: AttendanceAggregateCache;
  paymentAnalyticsCache?: PaymentAnalyticsCache;
  inventoryCache?: InventoryAggregateCache;
  aggregateCache?: AggregateCache;
  enableRateLimit?: boolean;
  enableJobs?: boolean;
  clock?: () => Date;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? loadEnv();
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info"
    }
  });

  const authRepository = options.authRepository ?? new PrismaAuthRepository(prisma);
  const memberRepository = options.memberRepository ?? new PrismaMemberRepository(prisma);
  const attendanceRepository = options.attendanceRepository ?? new PrismaAttendanceRepository(prisma);
  const membershipRepository = options.membershipRepository ?? new PrismaMembershipRepository(prisma);
  const paymentRepository = options.paymentRepository ?? new PrismaPaymentRepository(prisma);
  const inventoryRepository = options.inventoryRepository ?? new PrismaInventoryRepository(prisma);
  const productOrderRepository = options.productOrderRepository ?? new PrismaProductOrderRepository(prisma);
  const staffRepository = options.staffRepository ?? new PrismaStaffRepository(prisma);
  const activityLogRepository = options.activityLogRepository ?? new PrismaActivityLogRepository(prisma);
  const notificationRepository = options.notificationRepository ?? new PrismaNotificationRepository(prisma);
  const reportRepository = options.reportRepository ?? new PrismaReportRepository(prisma);
  const settingsRepository = options.settingsRepository ?? new PrismaSettingsRepository(prisma);
  const inquiryRepository = options.inquiryRepository ?? new PrismaInquiryRepository(prisma);
  const attendanceCache =
    options.attendanceCache ?? (env.NODE_ENV === "test" ? new NullAttendanceAggregateCache() : new RedisAttendanceAggregateCache(env));
  const paymentAnalyticsCache =
    options.paymentAnalyticsCache ?? (env.NODE_ENV === "test" ? new NullPaymentAnalyticsCache() : new RedisPaymentAnalyticsCache(env));
  const inventoryCache =
    options.inventoryCache ?? (env.NODE_ENV === "test" ? new NullInventoryAggregateCache() : new RedisInventoryAggregateCache(env));
  const aggregateCache = options.aggregateCache ?? (env.NODE_ENV === "test" ? new NullAggregateCache() : new RedisAggregateCache(env));
  const tokenService = new TokenService(env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES_IN);
  const authService = new AuthService(authRepository, tokenService, env);
  const memberService = new MemberService(
    memberRepository,
    authRepository,
    env.NODE_ENV === "test" && options.membershipRepository === undefined ? undefined : membershipRepository,
    options.clock,
    aggregateCache
  );
  const membershipService = new MembershipService(
    membershipRepository,
    memberRepository,
    authRepository,
    options.clock,
    aggregateCache,
    env.NODE_ENV === "test" && options.paymentRepository === undefined ? undefined : paymentRepository
  );
  const paymentService = new PaymentService(
    paymentRepository,
    memberRepository,
    membershipRepository,
    authRepository,
    options.clock,
    paymentAnalyticsCache,
    aggregateCache
  );
  const inventoryService = new InventoryService(
    inventoryRepository,
    memberRepository,
    authRepository,
    inventoryCache,
    paymentAnalyticsCache,
    aggregateCache
  );
  const productOrderService = new ProductOrderService(productOrderRepository, memberRepository, authRepository, aggregateCache);
  const staffService = new StaffService(staffRepository, memberRepository, authRepository, authRepository, options.clock, aggregateCache);
  const activityLogService = new ActivityLogService(activityLogRepository);
  const notificationService = new NotificationService(notificationRepository, authRepository, options.clock, aggregateCache);
  const settingsService = new SettingsService(settingsRepository, authRepository, aggregateCache);
  const inquiryService = new InquiryService(inquiryRepository, membershipRepository, authRepository);
  const reportService = new ReportService(
    reportRepository,
    paymentRepository,
    attendanceRepository,
    inventoryRepository,
    aggregateCache,
    options.clock
  );
  const dashboardService = new DashboardService(
    attendanceRepository,
    paymentRepository,
    membershipRepository,
    inventoryRepository,
    activityLogRepository,
    aggregateCache,
    options.clock
  );
  const attendanceService = new AttendanceService(
    attendanceRepository,
    memberRepository,
    memberService,
    authRepository,
    options.clock,
    attendanceCache,
    aggregateCache
  );

  app.addHook("onClose", () => {
    attendanceCache.close();
    paymentAnalyticsCache.close();
    inventoryCache.close();
    aggregateCache.close();
  });

  await registerErrorHandler(app);



  await registerSecurity(
    app,
    options.enableRateLimit === undefined ? { env } : { env, enableRateLimit: options.enableRateLimit }
  );
  registerAuthMiddleware(app, {
    repository: authRepository,
    tokenService
  });

  app.get("/", async () => ({
    status: "ok"
  }));

  app.get("/health", async () => ({
    status: "ok"
  }));

  await app.register(publicRoutes, {
    prefix: "/public",
    inquiryService
  });

  await app.register(authRoutes, {
    prefix: "/auth",
    authService,
    env
  });

  await app.register(memberRoutes, {
    prefix: "/members",
    memberService,
    attendanceService,
    membershipService,
    paymentService
  });

  await app.register(membershipPlanRoutes, {
    prefix: "/membership-plans",
    membershipService
  });

  await app.register(attendanceRoutes, {
    prefix: "/attendance",
    attendanceService
  });

  await app.register(invoiceRoutes, {
    prefix: "/invoices",
    paymentService
  });

  await app.register(paymentRoutes, {
    prefix: "/payments",
    paymentService
  });

  await app.register(inventoryRoutes, {
    prefix: "/inventory",
    inventoryService
  });

  await app.register(productOrderRoutes, {
    prefix: "/orders",
    productOrderService
  });

  await app.register(staffRoutes, {
    prefix: "/staff",
    staffService
  });

  await app.register(planRoutes, {
    prefix: "/plans",
    staffService
  });

  await app.register(activityLogRoutes, {
    prefix: "/activity-logs",
    activityLogService
  });

  await app.register(notificationRoutes, {
    prefix: "/notifications",
    notificationService
  });

  await app.register(settingsRoutes, {
    prefix: "/settings",
    settingsService
  });

  await app.register(inquiryRoutes, {
    prefix: "/inquiries",
    inquiryService
  });

  await app.register(reportRoutes, {
    prefix: "/reports",
    reportService
  });

  await app.register(dashboardRoutes, {
    prefix: "/dashboard",
    dashboardService
  });

  if (options.enableJobs ?? env.NODE_ENV !== "test") {
    registerAttendanceAutoCheckoutJob(app, attendanceService);
    registerMembershipExpiryJob(app, membershipService);
  }

  return app;
}
