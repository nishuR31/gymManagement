import type { InvoiceDto, PaymentAnalyticsDto, PaymentAnalyticsRange, PaymentMethod, PaymentDto } from "@gym/shared";
import { api } from "../../services/api";

export async function createInvoice(memberId: string, payload: { amountDueCents: number; dueDate: string; subscriptionId?: string }): Promise<InvoiceDto> {
  const response = await api.post<{ invoice: InvoiceDto }>(`/members/${memberId}/invoices`, payload);
  return response.data.invoice;
}

export async function getInvoice(id: string): Promise<InvoiceDto> {
  const response = await api.get<{ invoice: InvoiceDto }>(`/invoices/${id}`);
  return response.data.invoice;
}

export async function recordPayment(invoiceId: string, payload: { amountCents: number; method: PaymentMethod }): Promise<InvoiceDto> {
  const response = await api.post<{ invoice: InvoiceDto }>(`/invoices/${invoiceId}/payments`, payload);
  return response.data.invoice;
}

export async function refundPayment(paymentId: string, payload: { amountCents: number; reason: string }): Promise<InvoiceDto> {
  const response = await api.post<{ invoice: InvoiceDto }>(`/payments/${paymentId}/refund`, payload);
  return response.data.invoice;
}

export async function listMemberPayments(memberId: string): Promise<PaymentDto[]> {
  const response = await api.get<{ data: PaymentDto[] }>(`/members/${memberId}/payments`);
  return response.data.data;
}

export async function listMemberInvoices(memberId: string): Promise<InvoiceDto[]> {
  const response = await api.get<{ data: InvoiceDto[] }>(`/members/${memberId}/invoices`);
  return response.data.data;
}

export async function getPaymentAnalytics(range: PaymentAnalyticsRange): Promise<PaymentAnalyticsDto> {
  const response = await api.get<PaymentAnalyticsDto>("/payments/analytics", { params: { range } });
  return response.data;
}
