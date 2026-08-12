import type { FastifyInstance } from "fastify";
import { AttendanceController } from "../controllers/attendance.controller.js";
import type { AttendanceService } from "../services/attendance.service.js";

export interface AttendanceRoutesOptions {
  attendanceService: AttendanceService;
}

export async function attendanceRoutes(app: FastifyInstance, options: AttendanceRoutesOptions): Promise<void> {
  const controller = new AttendanceController(options.attendanceService);

  app.addHook("preHandler", app.authenticate);

  app.post("/check-in", controller.checkIn);
  app.post("/check-out", controller.checkOut);
  app.get("/current", controller.current);
  app.get("/daily", controller.daily);
  app.get("/monthly", controller.monthly);
}
