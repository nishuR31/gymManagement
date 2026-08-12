import cron, { type ScheduledTask } from "node-cron";
import type { FastifyInstance } from "fastify";
import type { AttendanceService } from "../services/attendance.service.js";

export function registerAttendanceAutoCheckoutJob(app: FastifyInstance, attendanceService: AttendanceService): ScheduledTask {
  const task = cron.schedule("*/15 * * * *", () => {
    void attendanceService.autoCloseStaleAttendances().catch((error: unknown) => {
      app.log.error({ error }, "attendance auto-checkout failed");
    });
  });

  app.addHook("onClose", () => {
    task.stop();
  });

  return task;
}
