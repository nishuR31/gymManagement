import type { PaymentMethod, ProductCategory, StockMovementType } from "@gym/shared";
import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { InvoiceRecord } from "./payment.repository.js";

export class InsufficientStockError extends Error {
  public constructor(public readonly availableStock: number) {
    super("Insufficient stock");
  }
}

export interface ProductRecord {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: ProductCategory;
  sku: string;
  priceCents: number;
  costCents: number;
  reorderThreshold: number;
  isActive: boolean;
  currentStock: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierRecord {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovementRecord {
  id: string;
  productId: string;
  supplierId: string | null;
  type: StockMovementType;
  quantityDelta: number;
  unitCostCents: number | null;
  unitPriceCents: number | null;
  reference: string | null;
  recordedBy: string;
  createdAt: Date;
}

export interface InventorySaleResultRecord {
  movement: StockMovementRecord;
  invoice: InvoiceRecord;
}

export interface CreateProductInput {
  name: string;
  description?: string | undefined;
  imageUrl?: string | undefined;
  category: ProductCategory;
  sku: string;
  priceCents: number;
  costCents: number;
  reorderThreshold: number;
}

export interface UpdateProductInput {
  name?: string | undefined;
  description?: string | null | undefined;
  imageUrl?: string | null | undefined;
  category?: ProductCategory | undefined;
  sku?: string | undefined;
  priceCents?: number | undefined;
  costCents?: number | undefined;
  reorderThreshold?: number | undefined;
  isActive?: boolean | undefined;
}

export interface CreateSupplierInput {
  name: string;
  contactName?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
}

export interface UpdateSupplierInput {
  name?: string | undefined;
  contactName?: string | null | undefined;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  isActive?: boolean | undefined;
}

export interface InventoryRepository {
  createProduct(input: CreateProductInput): Promise<ProductRecord>;
  updateProduct(id: string, input: UpdateProductInput): Promise<ProductRecord>;
  listProducts(includeInactive: boolean): Promise<ProductRecord[]>;
  findProductById(id: string): Promise<ProductRecord | null>;
  createSupplier(input: CreateSupplierInput): Promise<SupplierRecord>;
  updateSupplier(id: string, input: UpdateSupplierInput): Promise<SupplierRecord>;
  listSuppliers(includeInactive: boolean): Promise<SupplierRecord[]>;
  findSupplierById(id: string): Promise<SupplierRecord | null>;
  recordPurchase(input: MovementWriteInput): Promise<StockMovementRecord>;
  recordAdjustment(input: MovementWriteInput): Promise<StockMovementRecord>;
  recordSale(input: SaleWriteInput): Promise<InventorySaleResultRecord>;
  listMovements(filters: MovementListFilters): Promise<{ movements: StockMovementRecord[]; total: number }>;
  listLowStock(): Promise<ProductRecord[]>;
  valuation(): Promise<{ totalValueCents: number; products: ProductValuationRecord[] }>;
}

export interface MovementWriteInput {
  productId: string;
  supplierId?: string | undefined;
  quantity: number;
  unitCostCents?: number | undefined;
  reference?: string | undefined;
  recordedBy: string;
}

export interface MovementListFilters {
  productId?: string | undefined;
  supplierId?: string | undefined;
  type?: StockMovementType | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  page: number;
  pageSize: number;
}

export interface SaleWriteInput {
  memberId: string;
  productId: string;
  quantity: number;
  method: PaymentMethod;
  reference?: string | undefined;
  recordedBy: string;
  soldAt?: Date | undefined;
}

export interface ProductValuationRecord {
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  costCents: number;
  valueCents: number;
}

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PrismaInventoryRepository implements InventoryRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createProduct(input: CreateProductInput): Promise<ProductRecord> {
    const product = await this.prisma.product.create({
      data: {
        name: input.name,
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        category: input.category,
        sku: input.sku,
        priceCents: input.priceCents,
        costCents: input.costCents,
        reorderThreshold: input.reorderThreshold
      }
    });
    return toProductRecord(product, 0);
  }

  public async updateProduct(id: string, input: UpdateProductInput): Promise<ProductRecord> {
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.priceCents !== undefined ? { priceCents: input.priceCents } : {}),
        ...(input.costCents !== undefined ? { costCents: input.costCents } : {}),
        ...(input.reorderThreshold !== undefined ? { reorderThreshold: input.reorderThreshold } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      }
    });
    return toProductRecord(product, await this.stockForProduct(id));
  }

  public async listProducts(includeInactive: boolean): Promise<ProductRecord[]> {
    const products = await this.prisma.product.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: "asc" }
    });
    const stocks = await this.stockByProduct();
    return products.map((product) => toProductRecord(product, stocks.get(product.id) ?? 0));
  }

  public async findProductById(id: string): Promise<ProductRecord | null> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    return product ? toProductRecord(product, await this.stockForProduct(id)) : null;
  }

  public async createSupplier(input: CreateSupplierInput): Promise<SupplierRecord> {
    const supplier = await this.prisma.supplier.create({
      data: {
        name: input.name,
        ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {})
      }
    });
    return supplier;
  }

  public async updateSupplier(id: string, input: UpdateSupplierInput): Promise<SupplierRecord> {
    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {})
      }
    });
  }

  public async listSuppliers(includeInactive: boolean): Promise<SupplierRecord[]> {
    return this.prisma.supplier.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: "asc" }
    });
  }

  public async findSupplierById(id: string): Promise<SupplierRecord | null> {
    return this.prisma.supplier.findUnique({ where: { id } });
  }

  public async recordPurchase(input: MovementWriteInput): Promise<StockMovementRecord> {
    const movement = await this.prisma.stockMovement.create({
      data: {
        productId: input.productId,
        type: "PURCHASE",
        quantityDelta: input.quantity,
        recordedBy: input.recordedBy,
        ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
        ...(input.unitCostCents !== undefined ? { unitCostCents: input.unitCostCents } : {}),
        ...(input.reference !== undefined ? { reference: input.reference } : {})
      }
    });
    return toMovementRecord(movement);
  }

  public async recordAdjustment(input: MovementWriteInput): Promise<StockMovementRecord> {
    const movement = await this.prisma.stockMovement.create({
      data: {
        productId: input.productId,
        type: "ADJUSTMENT",
        quantityDelta: input.quantity,
        recordedBy: input.recordedBy,
        ...(input.unitCostCents !== undefined ? { unitCostCents: input.unitCostCents } : {}),
        ...(input.reference !== undefined ? { reference: input.reference } : {})
      }
    });
    return toMovementRecord(movement);
  }

  public async recordSale(input: SaleWriteInput): Promise<InventorySaleResultRecord> {
    return this.withSerializableRetry(async () =>
      this.prisma.$transaction(
        async (tx) => {
          await lockProduct(tx, input.productId);
          const product = await tx.product.findUnique({ where: { id: input.productId } });
          if (!product || !product.isActive) {
            throw new Error("PRODUCT_NOT_FOUND");
          }

          const stock = await stockForProduct(tx, input.productId);
          if (input.quantity > stock) {
            throw new InsufficientStockError(stock);
          }

          const amountDueCents = product.priceCents * input.quantity;
          const invoice = await tx.invoice.create({
            data: {
              memberId: input.memberId,
              amountDueCents,
              status: "PAID",
              dueDate: input.soldAt ?? new Date()
            },
            include: invoiceInclude
          });
          await tx.payment.create({
            data: {
              invoiceId: invoice.id,
              amountCents: amountDueCents,
              method: input.method,
              paidAt: input.soldAt ?? new Date(),
              recordedBy: input.recordedBy
            }
          });
          const movement = await tx.stockMovement.create({
            data: {
              productId: input.productId,
              type: "SALE",
              quantityDelta: -input.quantity,
              unitPriceCents: product.priceCents,
              reference: input.reference ?? invoice.id,
              recordedBy: input.recordedBy
            }
          });
          const savedInvoice = await tx.invoice.findUniqueOrThrow({
            where: { id: invoice.id },
            include: invoiceInclude
          });
          return {
            movement: toMovementRecord(movement),
            invoice: toInvoiceRecord(savedInvoice)
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );
  }

  public async listMovements(filters: MovementListFilters): Promise<{ movements: StockMovementRecord[]; total: number }> {
    const where = {
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lt: filters.to } : {})
            }
          }
        : {})
    };
    const [movements, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      }),
      this.prisma.stockMovement.count({ where })
    ]);
    return {
      movements: movements.map(toMovementRecord),
      total
    };
  }

  public async listLowStock(): Promise<ProductRecord[]> {
    const products = await this.listProducts(false);
    return products.filter((product) => product.currentStock <= product.reorderThreshold);
  }

  public async valuation(): Promise<{ totalValueCents: number; products: ProductValuationRecord[] }> {
    const products = await this.listProducts(false);
    const rows = products.map((product) => ({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      currentStock: product.currentStock,
      costCents: product.costCents,
      valueCents: product.currentStock * product.costCents
    }));
    return {
      totalValueCents: rows.reduce((total, row) => total + row.valueCents, 0),
      products: rows
    };
  }

  private async stockForProduct(productId: string): Promise<number> {
    return stockForProduct(this.prisma, productId);
  }

  private async stockByProduct(): Promise<Map<string, number>> {
    const rows = await this.prisma.stockMovement.groupBy({
      by: ["productId"],
      _sum: { quantityDelta: true }
    });
    return new Map(rows.map((row) => [row.productId, row._sum.quantityDelta ?? 0]));
  }

  private async withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await operation();
      } catch (error: unknown) {
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) {
          continue;
        }
        throw error;
      }
    }
    return operation();
  }
}

const invoiceInclude = {
  payments: {
    include: {
      refunds: true
    },
    orderBy: {
      paidAt: "asc" as const
    }
  }
};

async function lockProduct(tx: TransactionClient, productId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
}

async function stockForProduct(client: TransactionClient | PrismaClient, productId: string): Promise<number> {
  const result = await client.stockMovement.aggregate({
    where: { productId },
    _sum: { quantityDelta: true }
  });
  return result._sum.quantityDelta ?? 0;
}

function toProductRecord(
  product: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    category: string;
    sku: string;
    priceCents: number;
    costCents: number;
    reorderThreshold: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  currentStock: number
): ProductRecord {
  return {
    ...product,
    description: product.description,
    imageUrl: product.imageUrl,
    category: product.category as ProductCategory,
    currentStock
  };
}

function toMovementRecord(movement: {
  id: string;
  productId: string;
  supplierId: string | null;
  type: string;
  quantityDelta: number;
  unitCostCents: number | null;
  unitPriceCents: number | null;
  reference: string | null;
  recordedBy: string;
  createdAt: Date;
}): StockMovementRecord {
  return {
    ...movement,
    type: movement.type as StockMovementType
  };
}

function toInvoiceRecord(invoice: {
  id: string;
  memberId: string;
  subscriptionId: string | null;
  amountDueCents: number;
  status: string;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  payments: {
    id: string;
    invoiceId: string;
    amountCents: number;
    method: string;
    paidAt: Date;
    recordedBy: string;
    createdAt: Date;
    refunds: {
      id: string;
      paymentId: string;
      amountCents: number;
      reason: string;
      refundedBy: string;
      refundedAt: Date;
    }[];
  }[];
}): InvoiceRecord {
  const amountPaidCents = invoice.payments.reduce(
    (total, payment) => total + payment.amountCents - payment.refunds.reduce((sum, refund) => sum + refund.amountCents, 0),
    0
  );
  return {
    ...invoice,
    amountPaidCents,
    remainingCents: Math.max(0, invoice.amountDueCents - amountPaidCents),
    status: invoice.status as InvoiceRecord["status"],
    payments: invoice.payments.map((payment) => {
      const refundedCents = payment.refunds.reduce((sum, refund) => sum + refund.amountCents, 0);
      return {
        ...payment,
        method: payment.method as PaymentMethod,
        refundableCents: payment.amountCents - refundedCents
      };
    })
  };
}
