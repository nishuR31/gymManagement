import { loadEnv } from "./core/config/env.js";
import type { Env } from "./core/config/env.js";
import { prisma } from "./core/plugins/prisma.js";

import { PrismaAuthRepository } from "./features/auth/auth.repository.js";
import { PrismaMemberRepository } from "./features/member/member.repository.js";
import { PrismaAttendanceRepository } from "./features/attendance/attendance.repository.js";
import { PrismaMembershipRepository } from "./features/membership/membership.repository.js";
import { PrismaPaymentRepository } from "./features/payment/payment.repository.js";
import { PrismaInventoryRepository } from "./features/inventory/inventory.repository.js";
import { PrismaProductOrderRepository } from "./features/product-order/product-order.repository.js";
import { PrismaStaffRepository } from "./features/staff/staff.repository.js";
import { PrismaActivityLogRepository } from "./features/activity-log/activity-log.repository.js";
import { PrismaNotificationRepository } from "./features/notification/notification.repository.js";
import { PrismaReportRepository } from "./features/report/report.repository.js";
import { PrismaSettingsRepository } from "./features/settings/settings.repository.js";
import { PrismaInquiryRepository } from "./features/inquiry/inquiry.repository.js";

import { RedisCacheService, NullCacheService } from "./core/cache/cache.service.js";

import { TokenService } from "./features/auth/token.service.js";
import { AuthService } from "./features/auth/auth.service.js";
import { MemberService } from "./features/member/member.service.js";
import { MembershipService } from "./features/membership/membership.service.js";
import { PaymentService } from "./features/payment/payment.service.js";
import { InventoryService } from "./features/inventory/inventory.service.js";
import { ProductOrderService } from "./features/product-order/product-order.service.js";
import { StaffService } from "./features/staff/staff.service.js";
import { ActivityLogService } from "./features/activity-log/activity-log.service.js";
import { NotificationService } from "./features/notification/notification.service.js";
import { SettingsService } from "./features/settings/settings.service.js";
import { InquiryService } from "./features/inquiry/inquiry.service.js";
import { ReportService } from "./features/report/report.service.js";
import { DashboardService } from "./features/dashboard/dashboard.service.js";
import { AttendanceService } from "./features/attendance/attendance.service.js";

import { configureServer } from "./server.js";

export async function bootstrap(options: any = {}) {
  const env = options.env ?? loadEnv();
  const authRepository = new PrismaAuthRepository(prisma);
  const memberRepository = new PrismaMemberRepository(prisma);
  const attendanceRepository = new PrismaAttendanceRepository(prisma);
  const membershipRepository = new PrismaMembershipRepository(prisma);
  const paymentRepository = new PrismaPaymentRepository(prisma);
  const inventoryRepository = new PrismaInventoryRepository(prisma);
  const productOrderRepository = new PrismaProductOrderRepository(prisma);
  const staffRepository = new PrismaStaffRepository(prisma);
  const activityLogRepository = new PrismaActivityLogRepository(prisma);
  const notificationRepository = new PrismaNotificationRepository(prisma);
  const reportRepository = new PrismaReportRepository(prisma);
  const settingsRepository = new PrismaSettingsRepository(prisma);
  const inquiryRepository = new PrismaInquiryRepository(prisma);

  const redisCache = env.NODE_ENV === "test" ? new NullCacheService() : new RedisCacheService(env.REDIS_URL);

  const tokenService = new TokenService(env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES_IN);
  const authService = new AuthService(authRepository, tokenService, env);

  const memberService = new MemberService(
    memberRepository,
    authRepository,
    membershipRepository,
    attendanceRepository,
    paymentRepository,
    options.clock, 
    redisCache
  );

  const membershipService = new MembershipService(
    membershipRepository,
    memberRepository,
    authRepository,
    options.clock,
    redisCache,
    paymentRepository
  );

  const paymentService = new PaymentService(
    paymentRepository,
    memberRepository,
    membershipRepository,
    authRepository,
    options.clock,
    redisCache
  );

  const inventoryService = new InventoryService(
    inventoryRepository,
    memberRepository,
    authRepository,
    redisCache,

  );

  const productOrderService = new ProductOrderService(productOrderRepository, memberRepository, authRepository, redisCache);
  const staffService = new StaffService(staffRepository, memberRepository, authRepository, authRepository, options.clock, redisCache);
  const activityLogService = new ActivityLogService(activityLogRepository);
  const notificationService = new NotificationService(notificationRepository, authRepository, options.clock, redisCache);
  const settingsService = new SettingsService(settingsRepository, authRepository, redisCache);
  const inquiryService = new InquiryService(inquiryRepository, membershipRepository, authRepository, redisCache);

  const reportService = new ReportService(
    reportRepository,
    paymentRepository,
    attendanceRepository,
    inventoryRepository,
    redisCache,
    options.clock
  );

  const dashboardService = new DashboardService(
    memberRepository,
    attendanceRepository,
    paymentRepository,
    membershipRepository,
    inventoryRepository,
    activityLogRepository,
    redisCache,
    options.clock
  );

  const attendanceService = new AttendanceService(
    attendanceRepository,
    memberRepository,
    memberService,
    authRepository,
    options.clock,
    redisCache
  );

  const serverOptions = {
    env,
    redisClient: redisCache instanceof RedisCacheService ? redisCache.getClient() : null,
    authRepository,
    tokenService,
    authService,
    memberService,
    attendanceService,
    membershipService,
    paymentService,
    inventoryService,
    productOrderService,
    staffService,
    activityLogService,
    notificationService,
    settingsService,
    inquiryService,
    reportService,
    dashboardService,
    enableRateLimit: options.enableRateLimit,
    enableJobs: options.enableJobs,
    clock: options.clock
  };

  const app = await configureServer(serverOptions);

  app.addHook("onClose", () => {
    redisCache.close();
  });

  return app;
}

// Start the server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await bootstrap();
  const env = loadEnv();

  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.API_PORT
    });
  } catch (error: unknown) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }

  const shutdown = async (): Promise<void> => {
    await app.close();
    await prisma.$disconnect();
  };

  process.on("SIGINT", () => { void shutdown(); });
  process.on("SIGTERM", () => { void shutdown(); });
}
