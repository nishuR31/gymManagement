import type { ProductDto } from "@gym/shared";
import { Boxes, CheckCircle2, ImageIcon, PackageSearch, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadBar } from "../components/ui/LoadBar";
import { Modal } from "../components/ui/Modal";
import * as inventoryApi from "../features/inventory/inventoryApi";
import * as orderApi from "../features/orders/orderApi";
import { useAppSelector } from "../store/hooks";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCents, readableStatus } from "../utils/format";

export function ProductsPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProductDto | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);
  const isMember = role === "MEMBER";

  useEffect(() => {
    async function load(): Promise<void> {
      setIsLoading(true);
      try {
        setProducts(await inventoryApi.listProducts());
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Could not load products"));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, []);

  const shownProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return products;
    }
    return products.filter((product) =>
      [product.name, product.sku, product.category, product.description ?? ""].some((value) => value.toLowerCase().includes(query))
    );
  }, [products, search]);

  const placeOrder = async (): Promise<void> => {
    if (!selected) {
      return;
    }
    setIsOrdering(true);
    try {
      const order = await orderApi.createOrder({ productId: selected.id, quantity: Number(quantity) });
      toast.success(`Order ${order.orderCode} placed`);
      setSelected(null);
      setQuantity("1");
      setProducts(await inventoryApi.listProducts());
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not place order"));
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <section className="grid max-w-7xl gap-6 animate-fade-in">
      <div className="bg-card grid gap-4 rounded-lg border border-border p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_320px] md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Product Shelf</p>
          <h2 className="mt-2 text-3xl font-black text-foreground">Products</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {isMember ? "Book gym products for offline payment and pickup." : "Browse active products exactly as members see them."}
          </p>
        </div>
        <Input label="Search products" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>

      {isLoading ? <div className="rounded-lg border border-border bg-card p-6 text-sm font-bold text-muted-foreground shadow-sm">Loading products</div> : null}
      {!isLoading && shownProducts.length === 0 ? <EmptyState icon={PackageSearch} title="No products available" description="Products added by admin will appear here." /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shownProducts.map((product) => (
          <article key={product.id} className="bg-card group grid min-w-0 overflow-hidden rounded-lg border border-border shadow-sm transition hover:-translate-y-1 hover:border-primary">
            <div className="aspect-[4/3] bg-secondary">
              {product.imageUrl ? (
                <img className="h-full w-full object-cover" src={product.imageUrl} alt={product.name} />
              ) : (
                <div className="grid h-full place-items-center text-primary">
                  <ImageIcon className="h-12 w-12" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="grid gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-foreground">{product.name}</p>
                    <p className="mt-1 text-xs font-black uppercase text-primary">{readableStatus(product.category)}</p>
                  </div>
                  <p className="numeric shrink-0 text-xl font-black text-foreground">{formatCents(product.priceCents)}</p>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-muted-foreground">{product.description ?? "Available at the gym desk."}</p>
              </div>
              <LoadBar value={product.currentStock} max={Math.max(1, product.reorderThreshold)} label={`${product.currentStock} available`} tone={stockTone(product)} />
              <Button
                disabled={!isMember || product.currentStock <= 0}
                variant={isMember ? "primary" : "secondary"}
                onClick={() => {
                  setSelected(product);
                  setQuantity("1");
                }}
              >
                {product.currentStock <= 0 ? <Boxes className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
                {isMember ? (product.currentStock <= 0 ? "Out of Stock" : "Book / Order") : "Member Preview"}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Modal title="Confirm Product Order" open={!!selected} onClose={() => setSelected(null)}>
        {selected ? (
          <div className="grid gap-4">
            <div className="rounded-md border border-border bg-background p-3">
              <p className="font-black text-foreground">{selected.name}</p>
              <p className="numeric mt-1 text-2xl font-black text-foreground">{formatCents(selected.priceCents * Number(quantity || "0"))}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">Payment is collected manually at the gym desk.</p>
            </div>
            <Input label="Quantity" type="number" min={1} max={selected.currentStock} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            <Button isLoading={isOrdering} disabled={Number(quantity) <= 0 || Number(quantity) > selected.currentStock} onClick={() => void placeOrder()}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Confirm Order
            </Button>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

function stockTone(product: ProductDto): "success" | "warning" | "danger" {
  if (product.currentStock <= product.reorderThreshold) {
    return "danger";
  }
  if (product.currentStock <= product.reorderThreshold * 2) {
    return "warning";
  }
  return "success";
}
