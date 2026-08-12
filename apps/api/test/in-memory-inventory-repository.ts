import type { InvoiceStatus, PaymentMethod } from "@gym/shared";
import {
  InsufficientStockError,
  type CreateProductInput,
  type CreateSupplierInput,
  type InventoryRepository,
  type InventorySaleResultRecord,
  type MovementWriteInput,
  type ProductRecord,
  type ProductValuationRecord,
  type SaleWriteInput,
  type StockMovementRecord,
  type SupplierRecord,
  type UpdateProductInput,
  type UpdateSupplierInput
} from "../src/repositories/inventory.repository.js";
import type { InvoiceRecord, PaymentRecord } from "../src/repositories/payment.repository.js";

export class InMemoryInventoryRepository implements InventoryRepository {
  public readonly products = new Map<string, StoredProduct>();
  public readonly suppliers = new Map<string, SupplierRecord>();
  public readonly movements = new Map<string, StockMovementRecord>();
  public readonly invoices = new Map<string, InvoiceRecord>();
  public readonly payments = new Map<string, PaymentRecord>();

  private sequence = 0;

  public async createProduct(input: CreateProductInput): Promise<ProductRecord> {
    const now = new Date();
    const product: StoredProduct = { id: this.nextId("product"), ...input, isActive: true, createdAt: now, updatedAt: now };
    this.products.set(product.id, product);
    return this.hydrateProduct(product.id);
  }

  public async updateProduct(id: string, input: UpdateProductInput): Promise<ProductRecord> {
    const product = this.requireProduct(id);
    this.products.set(id, { ...product, ...input, updatedAt: new Date() });
    return this.hydrateProduct(id);
  }

  public async listProducts(includeInactive: boolean): Promise<ProductRecord[]> {
    return [...this.products.values()].filter((product) => includeInactive || product.isActive).map((product) => this.hydrateProduct(product.id));
  }

  public async findProductById(id: string): Promise<ProductRecord | null> {
    return this.products.has(id) ? this.hydrateProduct(id) : null;
  }

  public async createSupplier(input: CreateSupplierInput): Promise<SupplierRecord> {
    const now = new Date();
    const supplier: SupplierRecord = {
      id: this.nextId("supplier"),
      name: input.name,
      contactName: input.contactName ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    this.suppliers.set(supplier.id, supplier);
    return supplier;
  }

  public async updateSupplier(id: string, input: UpdateSupplierInput): Promise<SupplierRecord> {
    const supplier = this.suppliers.get(id);
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    const updated: SupplierRecord = { ...supplier, ...input, updatedAt: new Date() };
    this.suppliers.set(id, updated);
    return updated;
  }

  public async listSuppliers(includeInactive: boolean): Promise<SupplierRecord[]> {
    return [...this.suppliers.values()].filter((supplier) => includeInactive || supplier.isActive);
  }

  public async findSupplierById(id: string): Promise<SupplierRecord | null> {
    return this.suppliers.get(id) ?? null;
  }

  public async recordPurchase(input: MovementWriteInput): Promise<StockMovementRecord> {
    this.requireProduct(input.productId);
    return this.createMovement({
      productId: input.productId,
      supplierId: input.supplierId ?? null,
      type: "PURCHASE",
      quantityDelta: input.quantity,
      unitCostCents: input.unitCostCents ?? null,
      unitPriceCents: null,
      reference: input.reference ?? null,
      recordedBy: input.recordedBy
    });
  }

  public async recordAdjustment(input: MovementWriteInput): Promise<StockMovementRecord> {
    this.requireProduct(input.productId);
    return this.createMovement({
      productId: input.productId,
      supplierId: null,
      type: "ADJUSTMENT",
      quantityDelta: input.quantity,
      unitCostCents: input.unitCostCents ?? null,
      unitPriceCents: null,
      reference: input.reference ?? null,
      recordedBy: input.recordedBy
    });
  }

  public async recordSale(input: SaleWriteInput): Promise<InventorySaleResultRecord> {
    const product = this.requireProduct(input.productId);
    const currentStock = this.stockForProduct(input.productId);
    if (input.quantity > currentStock) {
      throw new InsufficientStockError(currentStock);
    }

    const amountDueCents = product.priceCents * input.quantity;
    const now = input.soldAt ?? new Date();
    const payment: PaymentRecord = {
      id: this.nextId("payment"),
      invoiceId: "",
      amountCents: amountDueCents,
      method: input.method,
      paidAt: now,
      recordedBy: input.recordedBy,
      refundableCents: amountDueCents,
      refunds: [],
      createdAt: now
    };
    const invoice: InvoiceRecord = {
      id: this.nextId("invoice"),
      memberId: input.memberId,
      subscriptionId: null,
      amountDueCents,
      amountPaidCents: amountDueCents,
      remainingCents: 0,
      status: "PAID" as InvoiceStatus,
      dueDate: now,
      createdAt: now,
      updatedAt: now,
      payments: []
    };
    const savedPayment = { ...payment, invoiceId: invoice.id };
    const savedInvoice = { ...invoice, payments: [savedPayment] };
    this.payments.set(savedPayment.id, savedPayment);
    this.invoices.set(savedInvoice.id, savedInvoice);
    const movement = this.createMovement({
      productId: input.productId,
      supplierId: null,
      type: "SALE",
      quantityDelta: -input.quantity,
      unitCostCents: null,
      unitPriceCents: product.priceCents,
      reference: input.reference ?? savedInvoice.id,
      recordedBy: input.recordedBy
    });
    return { movement, invoice: savedInvoice };
  }

  public async listMovements(filters: { productId?: string; supplierId?: string; type?: StockMovementRecord["type"]; from?: Date; to?: Date; page: number; pageSize: number }): Promise<{ movements: StockMovementRecord[]; total: number }> {
    const all = [...this.movements.values()]
      .filter((movement) => !filters.productId || movement.productId === filters.productId)
      .filter((movement) => !filters.supplierId || movement.supplierId === filters.supplierId)
      .filter((movement) => !filters.type || movement.type === filters.type)
      .filter((movement) => !filters.from || movement.createdAt >= filters.from)
      .filter((movement) => !filters.to || movement.createdAt < filters.to)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return {
      movements: all.slice((filters.page - 1) * filters.pageSize, filters.page * filters.pageSize),
      total: all.length
    };
  }

  public async listLowStock(): Promise<ProductRecord[]> {
    return (await this.listProducts(false)).filter((product) => product.currentStock <= product.reorderThreshold);
  }

  public async valuation(): Promise<{ totalValueCents: number; products: ProductValuationRecord[] }> {
    const products = (await this.listProducts(false)).map((product) => ({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      currentStock: product.currentStock,
      costCents: product.costCents,
      valueCents: product.costCents * product.currentStock
    }));
    return { totalValueCents: products.reduce((total, product) => total + product.valueCents, 0), products };
  }

  private createMovement(input: Omit<StockMovementRecord, "id" | "createdAt">): StockMovementRecord {
    const movement: StockMovementRecord = { id: this.nextId("movement"), createdAt: new Date(), ...input };
    this.movements.set(movement.id, movement);
    return movement;
  }

  private hydrateProduct(id: string): ProductRecord {
    const product = this.requireProduct(id);
    return { ...product, currentStock: this.stockForProduct(id) };
  }

  private stockForProduct(productId: string): number {
    return [...this.movements.values()]
      .filter((movement) => movement.productId === productId)
      .reduce((total, movement) => total + movement.quantityDelta, 0);
  }

  private requireProduct(id: string): StoredProduct {
    const product = this.products.get(id);
    if (!product || !product.isActive) {
      throw new Error("PRODUCT_NOT_FOUND");
    }
    return product;
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }
}

type StoredProduct = Omit<ProductRecord, "currentStock">;
