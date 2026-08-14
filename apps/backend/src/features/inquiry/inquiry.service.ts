import type { InquiryDto, InquiryStatus, PaginatedInquiryDto, PublicMembershipPlanDto, RoleName } from "@gym/shared";
import { errors } from "../../core/errors/app-error.js";
import type { AuditWriter } from "../../features/member/member.service.js";
import type { InquiryRecord, InquiryRepository } from "./inquiry.repository.js";
import type { MembershipRepository } from "../../features/membership/membership.repository.js";
import type { RequestActor, RequestContext } from "../../core/types/auth.js";

export class InquiryService {
  public constructor(
    private readonly inquiryRepository: InquiryRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly auditWriter: AuditWriter
  ) {}

  public async publicPlans(): Promise<{ data: PublicMembershipPlanDto[] }> {
    const plans = await this.membershipRepository.listPlans(false);
    return {
      data: plans.map((plan) => ({
        name: plan.name,
        description: null,
        priceCents: plan.priceCents,
        durationDays: plan.durationDays
      }))
    };
  }

  public async createPublicInquiry(input: { name: string; email: string; phone: string; message: string }): Promise<InquiryDto> {
    const inquiry = await this.inquiryRepository.create(input);
    return toInquiryDto(inquiry);
  }

  public async list(input: { status?: InquiryStatus | undefined; page: number; pageSize: number }, actor: RequestActor): Promise<PaginatedInquiryDto> {
    ensureAdminOrAbove(actor.role);
    const result = await this.inquiryRepository.list(input);
    return {
      data: result.inquiries.map(toInquiryDto),
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / input.pageSize)
      }
    };
  }

  public async markRead(id: string, actor: RequestActor, context: RequestContext): Promise<InquiryDto> {
    ensureAdminOrAbove(actor.role);
    const inquiry = await this.inquiryRepository.markRead(id);
    if (!inquiry) {
      throw errors.notFound("Inquiry not found");
    }
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "INQUIRY_MARKED_READ",
      entity: "Inquiry",
      entityId: inquiry.id,
      ...context
    });
    return toInquiryDto(inquiry);
  }

  public async delete(id: string, actor: RequestActor, context: RequestContext): Promise<InquiryDto> {
    ensureAdminOrAbove(actor.role);
    const inquiry = await this.inquiryRepository.delete(id);
    if (!inquiry) {
      throw errors.notFound("Inquiry not found");
    }
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "INQUIRY_DELETED",
      entity: "Inquiry",
      entityId: inquiry.id,
      ...context
    });
    return toInquiryDto(inquiry);
  }
}

function toInquiryDto(inquiry: InquiryRecord): InquiryDto {
  return {
    id: inquiry.id,
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone,
    message: inquiry.message,
    status: inquiry.status,
    createdAt: inquiry.createdAt.toISOString()
  };
}

function ensureAdminOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN") {
    return;
  }
  throw errors.forbidden();
}
