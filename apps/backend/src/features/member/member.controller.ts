import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { memberStatuses } from "@gym/shared";
import { errors } from "../../core/errors/app-error.js";
import type { MemberService } from "./member.service.js";
import type { RequestContext } from "../../core/types/auth.js";
import { sendSuccess } from "../../core/utils/response.js";

export const idParamsSchema = z.object({
  id: z.string().min(1)
});

const optionalText = z.string().trim().min(1).max(255).optional();
const nullableText = z.string().trim().min(1).max(255).nullable().optional();
const optionalLongText = z.string().trim().min(1).max(5000).optional();
const nullableLongText = z.string().trim().min(1).max(5000).nullable().optional();
const positiveMeasurement = z.number().positive().max(500);

export const createMemberSchema = z.object({
  userId: z.string().min(1).optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, "Phone number must include valid prefix and digits").min(5).max(30),
  email: z.string().email().trim().regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Email is invalid").toLowerCase().or(z.literal('')).transform(e => e === '' ? undefined : e).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: optionalText,
  address: z.string().trim().min(1).max(1000).optional(),
  emergencyContactName: optionalText,
  emergencyContactPhone: optionalText,
  medicalNotes: optionalLongText,
  heightCm: positiveMeasurement.optional(),
  weightKg: positiveMeasurement.optional(),
  joinedAt: z.coerce.date().optional()
});

export const updateMemberSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().regex(/^\+?[1-9]\d{1,14}$/, "Phone number must include valid prefix and digits").min(5).max(30).optional(),
    email: z.string().email().trim().regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Email is invalid").toLowerCase().or(z.literal('')).transform(e => e === '' ? null : e).nullable().optional(),
    dateOfBirth: z.coerce.date().nullable().optional(),
    gender: nullableText,
    address: z.string().trim().min(1).max(1000).nullable().optional(),
    emergencyContactName: nullableText,
    emergencyContactPhone: nullableText,
    medicalNotes: nullableLongText,
    heightCm: positiveMeasurement.nullable().optional(),
    weightKg: positiveMeasurement.nullable().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(memberStatuses).optional(),
  search: z.string().trim().min(1).max(120).optional()
});

export const suspendBodySchema = z.object({
  reason: z.string().trim().min(1).max(1000)
});

export class MemberController {
  public constructor(private readonly memberService: MemberService) { }

  public list = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const query = listMembersQuerySchema.parse(request.query);
    return this.memberService.listMembers(
      {
        page: query.page,
        pageSize: query.pageSize,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search ? { search: query.search } : {})
      },
      actor
    );
  };

  public me = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    return { member: await this.memberService.getCurrentMember(actor) };
  };

  public create = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const actor = requireActor(request);
    const body = createMemberSchema.parse(request.body);
    const member = await this.memberService.createMember(toCreateMemberInput(body), actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, { member });
  };

  public get = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const member = await this.memberService.getMember(params.id, actor);
    return { member };
  };

  public update = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const body = updateMemberSchema.parse(request.body);
    const member = await this.memberService.updateMember(params.id, toUpdateMemberInput(body), actor, getRequestContext(request));
    return { member };
  };

  public archive = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const member = await this.memberService.archiveMember(params.id, actor, getRequestContext(request));
    return { member };
  };

  public suspend = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const body = suspendBodySchema.parse(request.body);
    const member = await this.memberService.suspendMember(params.id, body.reason, actor, getRequestContext(request));
    return { member };
  };

  public restore = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const member = await this.memberService.restoreMember(params.id, actor, getRequestContext(request));
    return { member };
  };

  public regenerateQr = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    return this.memberService.regenerateQr(params.id, actor, getRequestContext(request));
  };

  public getQr = async (request: FastifyRequest): Promise<unknown> => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    return this.memberService.getQr(params.id, actor);
  };
}

function toCreateMemberInput(body: z.infer<typeof createMemberSchema>) {
  return {
    firstName: body.firstName,
    lastName: body.lastName,
    phone: body.phone,
    ...(body.userId ? { userId: body.userId } : {}),
    ...(body.email ? { email: body.email } : {}),
    ...(body.dateOfBirth ? { dateOfBirth: body.dateOfBirth } : {}),
    ...(body.gender ? { gender: body.gender } : {}),
    ...(body.address ? { address: body.address } : {}),
    ...(body.emergencyContactName ? { emergencyContactName: body.emergencyContactName } : {}),
    ...(body.emergencyContactPhone ? { emergencyContactPhone: body.emergencyContactPhone } : {}),
    ...(body.medicalNotes ? { medicalNotes: body.medicalNotes } : {}),
    ...(body.heightCm !== undefined ? { heightCm: body.heightCm } : {}),
    ...(body.weightKg !== undefined ? { weightKg: body.weightKg } : {}),
    ...(body.joinedAt ? { joinedAt: body.joinedAt } : {})
  };
}

function toUpdateMemberInput(body: z.infer<typeof updateMemberSchema>) {
  return {
    ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
    ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    ...(body.email !== undefined ? { email: body.email } : {}),
    ...(body.dateOfBirth !== undefined ? { dateOfBirth: body.dateOfBirth } : {}),
    ...(body.gender !== undefined ? { gender: body.gender } : {}),
    ...(body.address !== undefined ? { address: body.address } : {}),
    ...(body.emergencyContactName !== undefined ? { emergencyContactName: body.emergencyContactName } : {}),
    ...(body.emergencyContactPhone !== undefined ? { emergencyContactPhone: body.emergencyContactPhone } : {}),
    ...(body.medicalNotes !== undefined ? { medicalNotes: body.medicalNotes } : {}),
    ...(body.heightCm !== undefined ? { heightCm: body.heightCm } : {}),
    ...(body.weightKg !== undefined ? { weightKg: body.weightKg } : {})
  };
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
