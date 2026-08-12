import type { ProductOrderPaymentStatus, ProductOrderStatus } from "@gym/shared";
import { randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { InsufficientStockError } from "./inventory.repository.js";

export interface ProductOrderRecord {
  id: string;
  orderCode: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  memberPhone: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  amountCents: number;
  paymentStatus: ProductOrderPaymentStatus;
  status: ProductOrderStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductOrderInput {
  memberId: string;
  productId: string;
  quantity: number;
  notes?: string | undefined;
}

export interface ProductOrderListFilters {
  memberId?: string | undefined;
  productId?: string | undefined;
  status?: ProductOrderStatus | undefined;
  paymentStatus?: ProductOrderPaymentStatus | undefined;
  search?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
  sortBy: "createdAt" | "amountCents" | "status";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

export interface UpdateProductOrderInput {
  status?: ProductOrderStatus | undefined;
  paymentStatus?: ProductOrderPaymentStatus | undefined;
}

export interface ProductOrderRepository {
  create(input: CreateProductOrderInput, actorUserId: string): Promise<ProductOrderRecord>;
  findById(id: string): Promise<ProductOrderRecord | null>;
  list(filters: ProductOrderListFilters): Promise<{ orders: ProductOrderRecord[]; total: number }>;
  update(id: string, input: UpdateProductOrderInput, actorUserId: string): Promise<ProductOrderRecord>;
}

type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export class PrismaProductOrderRepository implements ProductOrderRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(input: CreateProductOrderInput, actorUserId: string): Promise<ProductOrderRecord> {
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

          const order = await tx.productOrder.create({
            data: {
              orderCode: createOrderCode(),
              memberId: input.memberId,
              productId: input.productId,
              quantity: input.quantity,
              amountCents: product.priceCents * input.quantity,
              ...(input.notes ? { notes: input.notes } : {})
            },
            include: productOrderInclude
          });

          await tx.stockMovement.create({
            data: {
              productId: input.productId,
              type: "SALE",
              quantityDelta: -input.quantity,
              unitPriceCents: product.priceCents,
              reference: order.orderCode,
              recordedBy: actorUserId
            }
          });

          return toOrderRecord(order);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );
  }

  public async findById(id: string): Promise<ProductOrderRecord | null> {
    const order = await this.prisma.productOrder.findUnique({
      where: { id },
      include: productOrderInclude
    });
    return order ? toOrderRecord(order) : null;
  }

  public async list(filters: ProductOrderListFilters): Promise<{ orders: ProductOrderRecord[]; total: number }> {
    const where = {
      ...(filters.memberId ? { memberId: filters.memberId } : {}),
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lt: filters.to } : {})
            }
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { orderCode: { contains: filters.search, mode: "insensitive" as const } },
              { member: { memberCode: { contains: filters.search, mode: "insensitive" as const } } },
              { member: { firstName: { contains: filters.search, mode: "insensitive" as const } } },
              { member: { lastName: { contains: filters.search, mode: "insensitive" as const } } },
              { member: { phone: { contains: filters.search, mode: "insensitive" as const } } },
              { product: { name: { contains: filters.search, mode: "insensitive" as const } } }
            ]
          }
        : {})
    };

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.productOrder.findMany({
        where,
        include: productOrderInclude,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      }),
      this.prisma.productOrder.count({ where })
    ]);

    return {
      orders: orders.map(toOrderRecord),
      total
    };
  }

  public async update(id: string, input: UpdateProductOrderInput, actorUserId: string): Promise<ProductOrderRecord> {
    return this.withSerializableRetry(async () =>
      this.prisma.$transaction(
        async (tx) => {
          const current = await tx.productOrder.findUniqueOrThrow({
            where: { id },
            include: productOrderInclude
          });

          if (input.status === "CANCELLED" && current.status !== "CANCELLED") {
            await tx.stockMovement.create({
              data: {
                productId: current.productId,
                type: "ADJUSTMENT",
                quantityDelta: current.quantity,
                reference: current.orderCode,
                recordedBy: actorUserId
              }
            });
          }

          const order = await tx.productOrder.update({
            where: { id },
            data: {
              ...(input.status ? { status: input.status } : {}),
              ...(input.paymentStatus ? { paymentStatus: input.paymentStatus } : {})
            },
            include: productOrderInclude
          });
          return toOrderRecord(order);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );
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

function createOrderCode(): string {
  return `ORD-${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
}

const productOrderInclude = {
  member: true,
  product: true
};

async function lockProduct(tx: TransactionClient, productId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
}

async function stockForProduct(client: TransactionClient, productId: string): Promise<number> {
  const result = await client.stockMovement.aggregate({
    where: { productId },
    _sum: { quantityDelta: true }
  });
  return result._sum.quantityDelta ?? 0;
}

function toOrderRecord(order: {
  id: string;
  orderCode: string;
  memberId: string;
  member: {
    memberCode: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  productId: string;
  product: {
    name: string;
    imageUrl: string | null;
  };
  quantity: number;
  amountCents: number;
  paymentStatus: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ProductOrderRecord {
  return {
    id: order.id,
    orderCode: order.orderCode,
    memberId: order.memberId,
    memberCode: order.member.memberCode,
    memberName: `${order.member.firstName} ${order.member.lastName}`,
    memberPhone: order.member.phone,
    productId: order.productId,
    productName: order.product.name,
    productImageUrl: order.product.imageUrl,
    quantity: order.quantity,
    amountCents: order.amountCents,
    paymentStatus: order.paymentStatus as ProductOrderPaymentStatus,
    status: order.status as ProductOrderStatus,
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}
