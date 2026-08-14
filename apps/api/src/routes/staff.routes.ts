import type { FastifyInstance, FastifyRequest } from "fastify";
import { staffProfileRoles } from "@gym/shared";
import { z } from "zod";
import { errors } from "../errors/app-error.js";
import type { StaffService } from "../services/staff.service.js";
import type { RequestContext } from "../types/auth.js";

export interface StaffRoutesOptions {
  staffService: StaffService;
}

const idParamsSchema = z.object({ id: z.string().min(1) });

const createProfileSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(staffProfileRoles),
  salaryCents: z.number().int().nonnegative()
});

const updateProfileSchema = createProfileSchema
  .omit({ userId: true })
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const leaveSchema = z.object({
  staffProfileId: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().trim().min(1).max(1000)
});

const reviewLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"])
});

const attendanceQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export async function staffRoutes(app: FastifyInstance, options: StaffRoutesOptions): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.get("/profiles", async (request) => options.staffService.listProfiles(requireActor(request)));

  app.post("/profiles", async (request, reply) => {
    const actor = requireActor(request);
    const body = createProfileSchema.parse(request.body);
    const profile = await options.staffService.createProfile(body, actor, getRequestContext(request));
    reply.status(201).send({ profile });
  });

  app.patch("/profiles/:id", async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const body = updateProfileSchema.parse(request.body);
    return { profile: await options.staffService.updateProfile(params.id, body, actor, getRequestContext(request)) };
  });

  app.post("/profiles/:id/login", async (request, reply) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const login = await options.staffService.createOrRegenerateLogin(params.id, actor, getRequestContext(request));
    reply.status(201).send({ login });
  });

  app.post("/profiles/:id/check-in", async (request, reply) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const attendance = await options.staffService.checkIn(params.id, actor, getRequestContext(request));
    reply.status(201).send({ attendance });
  });

  app.post("/profiles/:id/check-out", async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    return { attendance: await options.staffService.checkOut(params.id, actor, getRequestContext(request)) };
  });

  app.get("/profiles/:id/attendance", async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const query = attendanceQuerySchema.parse(request.query);
    return options.staffService.listAttendance({ staffProfileId: params.id, ...query }, actor);
  });

  app.get("/leave-requests", async (request) => {
    const actor = requireActor(request);
    const query = z.object({ staffProfileId: z.string().min(1).optional() }).parse(request.query);
    return options.staffService.listLeaveRequests(actor, query.staffProfileId);
  });

  app.post("/leave-requests", async (request, reply) => {
    const actor = requireActor(request);
    const body = leaveSchema.parse(request.body);
    const leaveRequest = await options.staffService.createLeaveRequest(body, actor, getRequestContext(request));
    reply.status(201).send({ leaveRequest });
  });

  app.post("/leave-requests/:id/review", async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const body = reviewLeaveSchema.parse(request.body);
    return { leaveRequest: await options.staffService.reviewLeaveRequest(params.id, body.status, actor, getRequestContext(request)) };
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
