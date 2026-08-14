import type {
  InventoryValuationDto,
  LowStockProductDto,
  PaymentMethod,
  ProductDto,
  RoleName,
  StockMovementDto,
  SupplierDto
} from "@gym/shared";
import { AppError, errors } from "../../core/errors/app-error.js";
import {
  InsufficientStockError,
  type CreateProductInput,
  type CreateSupplierInput,
  type InventoryRepository,
  type MovementListFilters,
  type MovementWriteInput,
  type ProductRecord,
  type StockMovementRecord,
  type SupplierRecord,
  type UpdateProductInput,
  type UpdateSupplierInput
} from "./inventory.repository.js";
import type { MemberRepository } from "../../features/member/member.repository.js";
import type { AuditWriter } from "../../features/member/member.service.js";
import type { RequestActor, RequestContext } from "../../core/types/auth.js";
import {
  inventoryLowStockCacheKey,
  inventoryValuationCacheKey,
  NullInventoryCacheService,
  type InventoryCacheService
} from "./inventory-cache.service.js";
import { paymentAnalyticsCacheKey, type PaymentAnalyticsCache } from "../../features/payment/payment-cache.service.js";
import { invalidateDashboardAndReports, type CacheService } from "../../core/cache/cache.service.js";

const paymentRanges = ["daily", "weekly", "monthly", "yearly"];

export class InventoryService {
  public constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly memberRepository: MemberRepository,
    private readonly auditWriter: AuditWriter,
    private readonly cache?: CacheService
  ) {}

  public async createProduct(input: CreateProductInput, actor: RequestActor, context: RequestContext): Promise<ProductDto> {
    ensureAdminOrAbove(actor.role);
    const product = await this.inventoryRepository.createProduct(input);
    await this.auditWriter.writeAuditLog({ userId: actor.id, action: "PRODUCT_CREATED", entity: "Product", entityId: product.id, ...context });
    await this.invalidateInventoryAggregates();
    await invalidateDashboardAndReports(this.cache);
    return toProductDto(product);
  }

  public async listProducts(actor: RequestActor, includeInactive: boolean): Promise<{ data: ProductDto[] }> {
    ensureProductViewer(actor.role);
    const products = await this.inventoryRepository.listProducts(actor.role === "MEMBER" ? false : includeInactive);
    return { data: products.map(toProductDto) };
  }

  public async updateProduct(id: string, input: UpdateProductInput, actor: RequestActor, context: RequestContext): Promise<ProductDto> {
    ensureAdminOrAbove(actor.role);
    const product = await this.inventoryRepository.updateProduct(id, input);
    await this.auditWriter.writeAuditLog({ userId: actor.id, action: "PRODUCT_UPDATED", entity: "Product", entityId: product.id, ...context });
    await this.invalidateInventoryAggregates();
    await invalidateDashboardAndReports(this.cache);
    return toProductDto(product);
  }

  public async archiveProduct(id: string, actor: RequestActor, context: RequestContext): Promise<ProductDto> {
    return this.updateProduct(id, { isActive: false }, actor, context);
  }

  public async createSupplier(input: CreateSupplierInput, actor: RequestActor, context: RequestContext): Promise<SupplierDto> {
    ensureAdminOrAbove(actor.role);
    const supplier = await this.inventoryRepository.createSupplier(input);
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "SUPPLIER_CREATED", entity: "Supplier", entityId: supplier.id, ...context }),
      invalidateDashboardAndReports(this.cache)
    ]);
    return toSupplierDto(supplier);
  }

  public async listSuppliers(actor: RequestActor, includeInactive: boolean): Promise<{ data: SupplierDto[] }> {
    ensureStaffOrAbove(actor.role);
    const suppliers = await this.inventoryRepository.listSuppliers(includeInactive);
    return { data: suppliers.map(toSupplierDto) };
  }

  public async updateSupplier(id: string, input: UpdateSupplierInput, actor: RequestActor, context: RequestContext): Promise<SupplierDto> {
    ensureAdminOrAbove(actor.role);
    const supplier = await this.inventoryRepository.updateSupplier(id, input);
    await Promise.all([
      this.auditWriter.writeAuditLog({ userId: actor.id, action: "SUPPLIER_UPDATED", entity: "Supplier", entityId: supplier.id, ...context }),
      invalidateDashboardAndReports(this.cache)
    ]);
    return toSupplierDto(supplier);
  }

  public async recordPurchase(input: Omit<MovementWriteInput, "recordedBy">, actor: RequestActor, context: RequestContext): Promise<StockMovementDto> {
    ensureStaffOrAbove(actor.role);
    if (input.supplierId) {
      const supplier = await this.inventoryRepository.findSupplierById(input.supplierId);
      if (!supplier || !supplier.isActive) {
        throw errors.badRequest("Active supplier not found");
      }
    }
    const movement = await this.inventoryRepository.recordPurchase({ ...input, recordedBy: actor.id });
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "INVENTORY_PURCHASE_RECORDED",
      entity: "StockMovement",
      entityId: movement.id,
      metadata: { productId: movement.productId, supplierId: movement.supplierId, quantityDelta: movement.quantityDelta },
      ...context
    });
    await this.invalidateInventoryAggregates();
    await invalidateDashboardAndReports(this.cache);
    return toMovementDto(movement);
  }

  public async recordAdjustment(input: Omit<MovementWriteInput, "recordedBy">, actor: RequestActor, context: RequestContext): Promise<StockMovementDto> {
    ensureAdminOrAbove(actor.role);
    const movement = await this.inventoryRepository.recordAdjustment({ ...input, recordedBy: actor.id });
    await this.auditWriter.writeAuditLog({
      userId: actor.id,
      action: "INVENTORY_ADJUSTED",
      entity: "StockMovement",
      entityId: movement.id,
      metadata: { productId: movement.productId, quantityDelta: movement.quantityDelta },
      ...context
    });
    await this.invalidateInventoryAggregates();
    await invalidateDashboardAndReports(this.cache);
    return toMovementDto(movement);
  }

  public async recordSale(
    input: {
      memberId: string;
      productId: string;
      quantity: number;
      method: PaymentMethod;
      reference?: string | undefined;
      soldAt?: Date | undefined;
    },
    actor: RequestActor,
    context: RequestContext
  ): Promise<{ movement: StockMovementDto; invoiceId: string }> {
    ensureStaffOrAbove(actor.role);
    const member = await this.memberRepository.findById(input.memberId);
    if (!member) {
      throw errors.notFound("Member not found");
    }

    try {
      const result = await this.inventoryRepository.recordSale({
        ...input,
        recordedBy: actor.id
      });
      await this.auditWriter.writeAuditLog({
        userId: actor.id,
        action: "INVENTORY_SALE_RECORDED",
        entity: "StockMovement",
        entityId: result.movement.id,
        metadata: {
          memberId: input.memberId,
          productId: input.productId,
          quantity: input.quantity,
          invoiceId: result.invoice.id
        },
        ...context
      });
      await this.invalidateInventoryAggregates();
      await this.invalidatePaymentAnalytics();
      await invalidateDashboardAndReports(this.cache);
      return {
        movement: toMovementDto(result.movement),
        invoiceId: result.invoice.id
      };
    } catch (error: unknown) {
      if (error instanceof InsufficientStockError) {
        throw new AppError(409, "INSUFFICIENT_STOCK", "Insufficient stock for sale", {
          availableStock: error.availableStock
        });
      }
      if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
        throw errors.notFound("Product not found");
      }
      throw error;
    }
  }

  public async listLowStock(actor: RequestActor): Promise<{ data: LowStockProductDto[] }> {
    ensureStaffOrAbove(actor.role);
    const cached = await this.cache?.get<{ data: LowStockProductDto[] }>(inventoryLowStockCacheKey);
    if (cached) {
      return cached;
    }
    const data = (await this.inventoryRepository.listLowStock()).map(toProductDto);
    const result = { data };
    await this.cache?.set(inventoryLowStockCacheKey, result);
    return result;
  }

  public async valuation(actor: RequestActor): Promise<InventoryValuationDto> {
    ensureAdminOrAbove(actor.role);
    const cached = await this.cache?.get<InventoryValuationDto>(inventoryValuationCacheKey);
    if (cached) {
      return cached;
    }
    const result = await this.inventoryRepository.valuation();
    await this.cache?.set(inventoryValuationCacheKey, result);
    return result;
  }

  public async listMovements(actor: RequestActor, filters: MovementListFilters): Promise<{ data: StockMovementDto[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
    ensureStaffOrAbove(actor.role);
    const result = await this.inventoryRepository.listMovements(filters);
    return {
      data: result.movements.map(toMovementDto),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / filters.pageSize)
      }
    };
  }

  private async invalidateInventoryAggregates(): Promise<void> {
    try {
      await this.cache?.delete([inventoryLowStockCacheKey, inventoryValuationCacheKey]);
    } catch {
      return;
    }
  }

  private async invalidatePaymentAnalytics(): Promise<void> {
    if (!this.cache) {
      return;
    }
    try {
      await this.cache?.delete(paymentRanges.map(paymentAnalyticsCacheKey));
    } catch {
      return;
    }
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

function ensureProductViewer(role: RoleName): void {
  if (role === "MEMBER") {
    return;
  }
  ensureStaffOrAbove(role);
}

function toProductDto(product: ProductRecord): ProductDto {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  };
}

function toSupplierDto(supplier: SupplierRecord): SupplierDto {
  return {
    ...supplier,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString()
  };
}

function toMovementDto(movement: StockMovementRecord): StockMovementDto {
  return {
    ...movement,
    createdAt: movement.createdAt.toISOString()
  };
}
