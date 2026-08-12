import type {
  InventoryValuationDto,
  PaymentMethod,
  ProductCategory,
  ProductDto,
  StockMovementDto,
  SupplierDto
} from "@gym/shared";
import { api } from "../../services/api";

export interface ProductPayload {
  name: string;
  description?: string;
  imageUrl?: string;
  category: ProductCategory;
  sku: string;
  priceCents: number;
  costCents: number;
  reorderThreshold: number;
}

export async function listProducts(params?: { includeInactive?: boolean }): Promise<ProductDto[]> {
  const response = await api.get<{ data: ProductDto[] }>("/inventory/products", { params });
  return response.data.data;
}

export async function createProduct(payload: ProductPayload): Promise<ProductDto> {
  const response = await api.post<{ product: ProductDto }>("/inventory/products", payload);
  return response.data.product;
}

export async function updateProduct(id: string, payload: Partial<ProductPayload> & { isActive?: boolean }): Promise<ProductDto> {
  const response = await api.patch<{ product: ProductDto }>(`/inventory/products/${id}`, payload);
  return response.data.product;
}

export async function deleteProduct(id: string): Promise<ProductDto> {
  const response = await api.delete<{ product: ProductDto }>(`/inventory/products/${id}`);
  return response.data.product;
}

export async function listSuppliers(): Promise<SupplierDto[]> {
  const response = await api.get<{ data: SupplierDto[] }>("/inventory/suppliers");
  return response.data.data;
}

export async function createSupplier(payload: { name: string; contactName?: string; phone?: string; email?: string }): Promise<SupplierDto> {
  const response = await api.post<{ supplier: SupplierDto }>("/inventory/suppliers", payload);
  return response.data.supplier;
}

export async function recordPurchase(payload: { productId: string; supplierId?: string; quantity: number; unitCostCents?: number; reference?: string }): Promise<StockMovementDto> {
  const response = await api.post<{ movement: StockMovementDto }>("/inventory/purchase", payload);
  return response.data.movement;
}

export async function recordAdjustment(payload: { productId: string; quantity: number; reference?: string }): Promise<StockMovementDto> {
  const response = await api.post<{ movement: StockMovementDto }>("/inventory/adjustment", payload);
  return response.data.movement;
}

export async function recordSale(payload: { memberId: string; productId: string; quantity: number; method: PaymentMethod; reference?: string }): Promise<{ movement: StockMovementDto; invoiceId: string }> {
  const response = await api.post<{ movement: StockMovementDto; invoiceId: string }>("/inventory/sale", payload);
  return response.data;
}

export async function listLowStock(): Promise<ProductDto[]> {
  const response = await api.get<{ data: ProductDto[] }>("/inventory/low-stock");
  return response.data.data;
}

export async function getValuation(): Promise<InventoryValuationDto> {
  const response = await api.get<InventoryValuationDto>("/inventory/valuation");
  return response.data;
}

export async function listMovements(productId?: string): Promise<StockMovementDto[]> {
  const response = await api.get<{ data: StockMovementDto[] }>("/inventory/movements", {
    params: productId ? { productId } : {}
  });
  return response.data.data;
}
