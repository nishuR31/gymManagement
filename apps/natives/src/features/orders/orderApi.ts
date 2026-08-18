import type { ProductOrderDto, ProductOrderPaymentStatus, ProductOrderStatus } from "@gym/shared";
import { api } from "../../services/api";

export interface OrderListParams {
  memberId?: string;
  productId?: string;
  status?: ProductOrderStatus;
  paymentStatus?: ProductOrderPaymentStatus;
  search?: string;
  from?: string;
  to?: string;
  sortBy?: "createdAt" | "amountCents" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedOrders {
  data: ProductOrderDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function listOrders(params?: OrderListParams): Promise<PaginatedOrders> {
  const response = await api.get<PaginatedOrders>("/orders", { params });
  return response.data;
}

export async function createOrder(payload: { memberId?: string; productId: string; quantity: number; notes?: string }): Promise<ProductOrderDto> {
  const response = await api.post<{ order: ProductOrderDto }>("/orders", payload);
  return response.data.order;
}

export async function updateOrder(
  id: string,
  payload: { status?: ProductOrderStatus; paymentStatus?: ProductOrderPaymentStatus }
): Promise<ProductOrderDto> {
  const response = await api.patch<{ order: ProductOrderDto }>(`/orders/${id}`, payload);
  return response.data.order;
}
