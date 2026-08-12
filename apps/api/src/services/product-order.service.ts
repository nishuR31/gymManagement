import type { ProductOrderDto, ProductOrderPaymentStatus, ProductOrderStatus, RoleName } from "@gym/shared";
import { AppError, errors } from "../errors/app-error.js";
import { InsufficientStockError } from "../repositories/inventory.repository.js";
import type { MemberRecord, MemberRepository } from "../repositories/member.repository.js";
import type {
  ProductOrderListFilters,
  ProductOrderRecord,
  ProductOrderRepository,
  UpdateProductOrderInput
} from "../repositories/product-order.repository.js";
import type { RequestActor, RequestContext } from "../types/auth.js";
import { invalidateDashboardAndReports, type AggregateCache } from "./aggregate-cache.service.js";
import type { AuditWriter } from "./member.service.js";

export interface CreateOrderServiceInput {
  memberId?: string | undefined;
  productId: string;
  quantity: number;
  notes?: string | undefined;
}

export class ProductOrderService {
  public constructor(
    private readonly orderRepository: ProductOrderRepository,
    private readonly memberRepository: MemberRepository,
    private readonly auditWriter: AuditWriter,
    private readonly dashboardReportCache?: AggregateCache
  ) {}

  public async createOrder(input: CreateOrderServiceInput, actor: RequestActor, context: RequestContext): Promise<ProductOrderDto> {
    const member = await this.resolveOrderMember(input.memberId, actor);
    try {
      const order = await this.orderRepository.create(
        {
          memberId: member.id,
          productId: input.productId,
          quantity: input.quantity,
          ...(input.notes ? { notes: input.notes } : {})
        },
        actor.id
      );
      await this.auditWriter.writeAuditLog({
        userId: actor.id,
        action: "PRODUCT_ORDER_CREATED",
        entity: "ProductOrder",
        entityId: order.id,
        metadata: { orderCode: order.orderCode, memberId: member.id, productId: input.productId, quantity: input.quantity },
        ...context
      });
      await invalidateDashboardAndReports(this.dashboardReportCache);
      return toOrderDto(order);
    } catch (error: unknown) {
      if (error instanceof InsufficientStockError) {
        throw new AppError(409, "INSUFFICIENT_STOCK", "Product is not available in the requested quantity", {
          availableStock: error.availableStock
        });
      }
      if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
        throw errors.notFound("Product not found");
      }
      throw error;
    }
  }

  public async listOrders(
    filters: ProductOrderListFilters,
    actor: RequestActor
  ): Promise<{ data: ProductOrderDto[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const scopedFilters = await this.scopeFilters(filters, actor);
    const result = await this.orderRepository.list(scopedFilters);
    return {
      data: result.orders.map(toOrderDto),
      pagination: {
        page: scopedFilters.page,
        pageSize: scopedFilters.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / scopedFilters.pageSize)
      }
    };
  }

  public async getOrder(id: string, actor: RequestActor): Promise<ProductOrderDto> {
    const order = await this.findOrderOrThrow(id);
    await this.ensureCanReadOrder(order, actor);
    return toOrderDto(order);
  }

  public async updateOrder(id: string, input: UpdateProductOrderInput, actor: RequestActor, context: RequestContext): Promise<ProductOrderDto> {
    ensureAdminOrAbove(actor.role);
    const order = await this.orderRepository.update(id, input, actor.id);
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "PRODUCT_ORDER_UPDATED",
      entity: "ProductOrder",
      entityId: order.id,
      metadata: { orderCode: order.orderCode, status: order.status, paymentStatus: order.paymentStatus },
      ...context
    });
    await invalidateDashboardAndReports(this.dashboardReportCache);
    return toOrderDto(order);
  }

  private async resolveOrderMember(memberId: string | undefined, actor: RequestActor): Promise<MemberRecord> {
    if (actor.role === "MEMBER") {
      const member = await this.memberRepository.findByUserId(actor.id);
      if (!member) {
        throw errors.forbidden();
      }
      return member;
    }

    ensureStaffOrAbove(actor.role);
    if (!memberId) {
      throw errors.badRequest("Member is required");
    }
    const member = await this.memberRepository.findById(memberId);
    if (!member) {
      throw errors.notFound("Member not found");
    }
    return member;
  }

  private async scopeFilters(filters: ProductOrderListFilters, actor: RequestActor): Promise<ProductOrderListFilters> {
    if (actor.role === "MEMBER") {
      const member = await this.memberRepository.findByUserId(actor.id);
      if (!member) {
        throw errors.forbidden();
      }
      return { ...filters, memberId: member.id };
    }

    ensureStaffOrAbove(actor.role);
    return filters;
  }

  private async findOrderOrThrow(id: string): Promise<ProductOrderRecord> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw errors.notFound("Order not found");
    }
    return order;
  }

  private async ensureCanReadOrder(order: ProductOrderRecord, actor: RequestActor): Promise<void> {
    if (actor.role !== "MEMBER") {
      ensureStaffOrAbove(actor.role);
      return;
    }
    const member = await this.memberRepository.findByUserId(actor.id);
    if (member?.id === order.memberId) {
      return;
    }
    throw errors.forbidden();
  }
}

function ensureStaffOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN" || role === "STAFF") {
    return;
  }
  throw errors.forbidden();
}

function ensureAdminOrAbove(role: RoleName): void {
  if (role === "SUPER_ADMIN" || role === "GYM_OWNER" || role === "ADMIN") {
    return;
  }
  throw errors.forbidden();
}

function toOrderDto(order: ProductOrderRecord): ProductOrderDto {
  return {
    id: order.id,
    orderCode: order.orderCode,
    memberId: order.memberId,
    memberCode: order.memberCode,
    memberName: order.memberName,
    memberPhone: order.memberPhone,
    productId: order.productId,
    productName: order.productName,
    productImageUrl: order.productImageUrl,
    quantity: order.quantity,
    amountCents: order.amountCents,
    paymentStatus: order.paymentStatus as ProductOrderPaymentStatus,
    status: order.status as ProductOrderStatus,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString()
  };
}
