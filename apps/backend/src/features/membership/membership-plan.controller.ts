import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { errors } from "../../core/errors/app-error.js";
import type { MembershipService } from "./membership.service.js";
import type { RequestContext } from "../../core/types/auth.js";
import { sendSuccess } from "../../core/utils/response.js";

export const idParamsSchema = z.object({
  id: z.string().min(1)
});

export const createPlanSchema = z.object({
  name: z.string().trim().min(1).max(120),
  durationDays: z.number().int().positive().max(3650),
  priceCents: z.number().int().nonnegative(),
  ptIncluded: z.boolean().default(false),
  lockerIncluded: z.boolean().default(false),
  guestPassesIncluded: z.number().int().nonnegative().default(0),
  accessTiming: z.string().trim().min(1).max(255).optional(),
  gracePeriodDays: z.number().int().nonnegative().max(90).default(0),
  freezeAllowed: z.boolean().default(false)
});

export const updatePlanSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    durationDays: z.number().int().positive().max(3650).optional(),
    priceCents: z.number().int().nonnegative().optional(),
    ptIncluded: z.boolean().optional(),
    lockerIncluded: z.boolean().optional(),
    guestPassesIncluded: z.number().int().nonnegative().optional(),
    accessTiming: z.string().trim().min(1).max(255).nullable().optional(),
    gracePeriodDays: z.number().int().nonnegative().max(90).optional(),
    freezeAllowed: z.boolean().optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export const listPlansQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false)
});

export class MembershipPlanController {
  public constructor(private readonly membershipService: MembershipService) {}

  public create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const actor = requireActor(request);
    const body = createPlanSchema.parse(request.body);
    const plan = await this.membershipService.createPlan(toCreatePlanInput(body), actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, { plan });
  };

  public list = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const query = listPlansQuerySchema.parse(request.query);
    const data = await this.membershipService.listPlans(actor, query.includeInactive);
    return { data };
  };

  public update = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const body = updatePlanSchema.parse(request.body);
    const plan = await this.membershipService.updatePlan(params.id, toUpdatePlanInput(body), actor, getRequestContext(request));
    return { plan };
  };

  public deactivate = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const plan = await this.membershipService.deactivatePlan(params.id, actor, getRequestContext(request));
    return { plan };
  };
}

function requireActor(request: FastifyRequest) {
  if (!request.actor) {
    throw errors.unauthorized();
  }

  return request.actor;
}

function toCreatePlanInput(body: z.infer<typeof createPlanSchema>) {
  return {
    name: body.name,
    durationDays: body.durationDays,
    priceCents: body.priceCents,
    ptIncluded: body.ptIncluded,
    lockerIncluded: body.lockerIncluded,
    guestPassesIncluded: body.guestPassesIncluded,
    ...(body.accessTiming ? { accessTiming: body.accessTiming } : {}),
    gracePeriodDays: body.gracePeriodDays,
    freezeAllowed: body.freezeAllowed
  };
}

function toUpdatePlanInput(body: z.infer<typeof updatePlanSchema>) {
  return {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.durationDays !== undefined ? { durationDays: body.durationDays } : {}),
    ...(body.priceCents !== undefined ? { priceCents: body.priceCents } : {}),
    ...(body.ptIncluded !== undefined ? { ptIncluded: body.ptIncluded } : {}),
    ...(body.lockerIncluded !== undefined ? { lockerIncluded: body.lockerIncluded } : {}),
    ...(body.guestPassesIncluded !== undefined ? { guestPassesIncluded: body.guestPassesIncluded } : {}),
    ...(body.accessTiming !== undefined ? { accessTiming: body.accessTiming } : {}),
    ...(body.gracePeriodDays !== undefined ? { gracePeriodDays: body.gracePeriodDays } : {}),
    ...(body.freezeAllowed !== undefined ? { freezeAllowed: body.freezeAllowed } : {}),
    ...(body.isActive !== undefined ? { isActive: body.isActive } : {})
  };
}

function getRequestContext(request: FastifyRequest): RequestContext {
  return {
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
  };
}
