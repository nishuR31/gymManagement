import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { AttendanceController, checkInBodySchema, checkOutBodySchema, dailyQuerySchema, historyQuerySchema, monthlyQuerySchema } from "./attendance.controller.js";
import type { AttendanceService } from "./attendance.service.js";

export interface AttendanceRoutesOptions {
  attendanceService: AttendanceService;
}

export async function attendanceRoutes(app: FastifyInstance, options: AttendanceRoutesOptions): Promise<void> {
  const controller = new AttendanceController(options.attendanceService);
  const server = app.withTypeProvider<ZodTypeProvider>();

  app.addHook("preHandler", app.authenticate);

  server.post("/check-in", { schema: { body: checkInBodySchema } }, controller.checkIn);
  server.post("/check-out", { schema: { body: checkOutBodySchema } }, controller.checkOut);
  server.get("/current", controller.current);
  server.get("/history", { schema: { querystring: historyQuerySchema } }, controller.history);
  server.get("/daily", { schema: { querystring: dailyQuerySchema } }, controller.daily);
  server.get("/monthly", { schema: { querystring: monthlyQuerySchema } }, controller.monthly);
}
