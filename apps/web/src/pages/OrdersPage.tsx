import type { ProductOrderDto, ProductOrderPaymentStatus, ProductOrderStatus } from "@gym/shared";
import { productOrderPaymentStatuses, productOrderStatuses } from "@gym/shared";
import { ClipboardList, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { StatusBadge } from "../components/ui/StatusBadge";
import * as orderApi from "../features/orders/orderApi";
import { useAppSelector } from "../store/hooks";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCents, formatDateTime } from "../utils/format";
import { isAdminRole } from "../utils/roles";

export function OrdersPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const canManage = isAdminRole(role);
  const [orders, setOrders] = useState<ProductOrderDto[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProductOrderStatus | "">("");
  const [paymentStatus, setPaymentStatus] = useState<ProductOrderPaymentStatus | "">("");
  const [selected, setSelected] = useState<ProductOrderDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await orderApi.listOrders({
        page: 1,
        pageSize: 50,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(status ? { status } : {}),
        ...(paymentStatus ? { paymentStatus } : {})
      });
      setOrders(response.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load orders"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status, paymentStatus]);

  const totals = useMemo(
    () => ({
      pending: orders.filter((order) => order.status === "PENDING").length,
      amount: orders.reduce((sum, order) => sum + order.amountCents, 0)
    }),
    [orders]
  );

  const updateOrder = async (payload: { status?: ProductOrderStatus; paymentStatus?: ProductOrderPaymentStatus }): Promise<void> => {
    if (!selected) {
      return;
    }
    try {
      const updated = await orderApi.updateOrder(selected.id, payload);
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setSelected(updated);
      toast.success("Order updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update order"));
    }
  };

  return (
    <section className="grid max-w-7xl gap-6 animate-fade-in">
      <div className="bg-card grid gap-4 rounded-lg border border-border p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(300px,auto)] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{canManage ? "Order Control" : "My Bookings"}</p>
          <h2 className="mt-2 text-3xl font-black text-foreground">{canManage ? "Orders" : "My Orders"}</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {canManage ? "Track member product bookings, payment state, and pickup readiness." : "Track product bookings and offline payment status."}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input label="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Button className="self-end" variant="secondary" onClick={() => void load()}>
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Orders" value={orders.length.toString()} />
        <Metric label="Pending Orders" value={totals.pending.toString()} />
        <Metric label="Booked Value" value={formatCents(totals.amount)} />
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            <span>Order status</span>
            <select className="h-11 rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25" value={status} onChange={(event) => setStatus(event.target.value as ProductOrderStatus | "")}>
              <option value="">All</option>
              {productOrderStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-foreground">
            <span>Payment status</span>
            <select className="h-11 rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as ProductOrderPaymentStatus | "")}>
              <option value="">All</option>
              {productOrderPaymentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
        {isLoading ? <div className="p-6 text-sm font-bold text-muted-foreground">Loading orders</div> : null}
        {!isLoading && orders.length === 0 ? <div className="p-4"><EmptyState icon={ClipboardList} title="No orders found" description="Product bookings will appear here." /></div> : null}
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="cursor-pointer transition hover:bg-secondary/40" onClick={() => setSelected(order)}>
                  <td className="numeric px-4 py-3 font-black text-primary">{order.orderCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-foreground">{order.memberName}</p>
                    <p className="numeric text-xs text-muted-foreground">{order.memberCode} · {order.memberPhone}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-muted-foreground">{order.productName}</td>
                  <td className="numeric px-4 py-3">{order.quantity}</td>
                  <td className="numeric px-4 py-3">{formatCents(order.amountCents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.paymentStatus} /></td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title="Order Details" open={!!selected} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="grid gap-4">
            <div className="rounded-md border border-border bg-background p-3">
              <p className="numeric text-xs font-black text-primary">{selected.orderCode}</p>
              <p className="mt-1 text-lg font-black text-foreground">{selected.productName}</p>
              <p className="numeric mt-2 text-3xl font-black text-foreground">{formatCents(selected.amountCents)}</p>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Detail label="Member" value={`${selected.memberName} (${selected.memberCode})`} />
              <Detail label="Quantity" value={selected.quantity.toString()} numeric />
              <Detail label="Payment" value={selected.paymentStatus} />
              <Detail label="Status" value={selected.status} />
              <Detail label="Ordered" value={formatDateTime(selected.createdAt)} />
              <Detail label="Phone" value={selected.memberPhone} numeric />
            </div>
            {canManage ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  <span>Order status</span>
                  <select className="h-11 rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25" value={selected.status} onChange={(event) => void updateOrder({ status: event.target.value as ProductOrderStatus })}>
                    {productOrderStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold text-foreground">
                  <span>Payment status</span>
                  <select className="h-11 rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/25" value={selected.paymentStatus} onChange={(event) => void updateOrder({ paymentStatus: event.target.value as ProductOrderPaymentStatus })}>
                    {productOrderPaymentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="numeric mt-2 text-3xl font-black text-foreground">{value}</p>
    </div>
  );
}

function Detail({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 font-bold text-foreground ${numeric ? "numeric" : ""}`}>{value}</p>
    </div>
  );
}
