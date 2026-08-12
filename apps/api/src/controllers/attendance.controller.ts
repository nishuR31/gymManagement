import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { errors } from "../errors/app-error.js";
import type { AttendanceService } from "../services/attendance.service.js";
import type { RequestContext } from "../types/auth.js";

const checkInBodySchema = z
  .object({
    memberId: z.string().min(1).optional(),
    qrPayload: z.string().min(1).optional(),
    query: z.string().trim().min(1).max(120).optional()
  })
  .refine((value) => [value.memberId, value.qrPayload, value.query].filter(Boolean).length === 1, {
    message: "Provide exactly one of memberId, qrPayload, or query"
  });

const checkOutBodySchema = z
  .object({
    memberId: z.string().min(1).optional(),
    attendanceId: z.string().min(1).optional()
  })
  .refine((value) => [value.memberId, value.attendanceId].filter(Boolean).length === 1, {
    message: "Provide exactly one of memberId or attendanceId"
  });

const dailyQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD").refine(isValidDateOnly, {
    message: "date must be a valid calendar date"
  })
});

const monthlyQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM").refine(isValidMonth, {
    message: "month must be a valid calendar month"
  })
});

export class AttendanceController {
  public constructor(private readonly attendanceService: AttendanceService) {}

  public checkIn = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const actor = requireActor(request);
    const body = checkInBodySchema.parse(request.body);
    const result = await this.attendanceService.checkIn(toCheckInInput(body), actor, getRequestContext(request));

    if (result.kind === "disambiguation") {
      reply.status(300).send({ matches: result.matches });
      return;
    }

    reply.status(201).send({ attendance: result.attendance });
  };

  public checkOut = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const body = checkOutBodySchema.parse(request.body);
    const attendance = await this.attendanceService.checkOut(toCheckOutInput(body), actor, getRequestContext(request));
    return { attendance };
  };

  public current = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const data = await this.attendanceService.listCurrent(actor);
    return { data };
  };

  public daily = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const query = dailyQuerySchema.parse(request.query);
    return this.attendanceService.getDailyAttendance(query.date, actor);
  };

  public monthly = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const query = monthlyQuerySchema.parse(request.query);
    return this.attendanceService.getMonthlyAttendance(query.month, actor);
  };
}

function requireActor(request: FastifyRequest) {
  if (!request.actor) {
    throw errors.unauthorized();
  }

  return request.actor;
}

function toCheckInInput(body: z.infer<typeof checkInBodySchema>) {
  return {
    ...(body.memberId ? { memberId: body.memberId } : {}),
    ...(body.qrPayload ? { qrPayload: body.qrPayload } : {}),
    ...(body.query ? { query: body.query } : {})
  };
}

function toCheckOutInput(body: z.infer<typeof checkOutBodySchema>) {
  return {
    ...(body.memberId ? { memberId: body.memberId } : {}),
    ...(body.attendanceId ? { attendanceId: body.attendanceId } : {})
  };
}

function getRequestContext(request: FastifyRequest): RequestContext {
  return {
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
  };
}

function isValidDateOnly(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidMonth(value: string): boolean {
  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
}
