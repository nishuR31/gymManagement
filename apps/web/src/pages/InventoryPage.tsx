import type { PaymentMethod, ProductCategory, ProductDto, StockMovementDto, SupplierDto } from "@gym/shared";
import { paymentMethods, productCategories } from "@gym/shared";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { LoadBar } from "../components/ui/LoadBar";
import { Modal } from "../components/ui/Modal";
import { SkeletonRows } from "../components/ui/Skeleton";
import * as inventoryApi from "../features/inventory/inventoryApi";
import { getApiErrorCode, getApiErrorMessage } from "../utils/apiError";
import { formatCents, formatDateTime } from "../utils/format";

type Action = "purchase" | "adjustment" | "sale";

export function InventoryPage() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [lowStock, setLowStock] = useState<ProductDto[]>([]);
  const [movements, setMovements] = useState<StockMovementDto[]>([]);
  const [valuation, setValuation] = useState(0);
  const [category, setCategory] = useState<ProductCategory | "">("");
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<Action | null>(null);
  const [editing, setEditing] = useState<ProductDto | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductDto | null>(null);

  const deleteProduct = async (): Promise<void> => {
    if (!productToDelete) {
      return;
    }
    try {
      await inventoryApi.deleteProduct(productToDelete.id);
      toast.success("Product deleted");
      setProductToDelete(null);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete product"));
    }
  };

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const [productRows, lowRows, movementRows, supplierRows, value] = await Promise.all([
        inventoryApi.listProducts(),
        inventoryApi.listLowStock(),
        inventoryApi.listMovements(),
        inventoryApi.listSuppliers().catch(() => []),
        inventoryApi.getValuation().catch(() => ({ totalValueCents: 0, products: [] }))
      ]);
      setProducts(productRows);
      setLowStock(lowRows);
      setMovements(movementRows);
      setSuppliers(supplierRows);
      setValuation(value.totalValueCents);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not load inventory"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const shownProducts = useMemo(
    () =>
      products.filter((product) => {
        if (category && product.category !== category) return false;
        if (lowOnly && product.currentStock > product.reorderThreshold) return false;
        return true;
      }),
    [category, lowOnly, products]
  );

  return (
    <section className="grid max-w-7xl min-w-0 gap-6 animate-fade-in">
      <div className="bg-card grid gap-4 rounded-lg border border-border p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Gym Vault</p>
          <h2 className="mt-2 text-3xl font-black text-foreground">Inventory</h2>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">Products, stock movements, sales, and valuation</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setAction("purchase")}>Purchase</Button>
          <Button variant="secondary" onClick={() => setAction("adjustment")}>Adjustment</Button>
          <Button onClick={() => setAction("sale")}>Sale</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Low Stock" className="hover:-translate-y-1 hover:border-brand">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-accent-soft text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="numeric text-4xl font-black text-primary-foreground">{lowStock.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Products at or below threshold</p>
        </Card>
        <Card title="Valuation" className="hover:-translate-y-1 hover:border-brand">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-line-faint text-primary">
            <IndianRupee className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="numeric text-4xl font-black text-primary-foreground">{formatCents(valuation)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Current stock at cost</p>
        </Card>
        <Card title="Reports" className="hover:-translate-y-1 hover:border-brand">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-line-faint text-primary">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Coming in Batch 2 Reports</p>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card
          title="Products"
          action={<Button className="h-9 px-3" onClick={() => setEditing({} as ProductDto)}>New Product</Button>}
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="grid min-w-0 gap-1 text-sm font-semibold text-foreground">
              <span>Category</span>
              <select className="h-10 w-full rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25" value={category} onChange={(event) => setCategory(event.target.value as ProductCategory | "")}>
                <option value="">All</option>
                {productCategories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <input className="h-4 w-4 rounded border-border bg-background text-primary focus-visible:focus-ring" type="checkbox" checked={lowOnly} onChange={(event) => setLowOnly(event.target.checked)} />
              Low stock only
            </label>
          </div>
          {loading ? <SkeletonRows /> : null}
          {!loading && shownProducts.length === 0 ? <EmptyState title="No products found" /> : null}
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Stock</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shownProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-3 py-3">
                      <p className="font-bold text-foreground">{product.name}</p>
                      <p className="text-xs font-semibold text-muted-foreground">{product.sku} · {product.category}</p>
                    </td>
                    <td className="numeric px-3 py-3">{formatCents(product.priceCents)}</td>
                    <td className="min-w-40 px-3 py-3">
                      <LoadBar value={product.currentStock} max={Math.max(1, product.reorderThreshold)} label={`${product.currentStock} in stock`} tone={stockTone(product)} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="h-9 px-3" onClick={() => setEditing(product)}>Edit</Button>
                        <Button variant="secondary" className="h-9 px-3 text-destructive" onClick={() => setProductToDelete(product)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Movements">
          {movements.length === 0 ? <EmptyState title="No movements yet" /> : null}
          <div className="grid max-h-[560px] gap-2 overflow-y-auto">
            {movements.map((movement) => (
              <div key={movement.id} className="min-w-0 rounded-md border border-border bg-background p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-bold text-foreground">{movement.type}</span>
                  <span className={movement.quantityDelta < 0 ? "numeric font-bold text-destructive" : "numeric font-bold text-success"}>
                    {movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}
                  </span>
                </div>
                <p className="numeric mt-1 truncate text-xs text-muted-foreground">{movement.productId}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(movement.createdAt)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <ProductModal product={editing} onClose={() => setEditing(null)} onSaved={() => void load()} />
      <Modal title="Delete Product" open={!!productToDelete} onClose={() => setProductToDelete(null)}>
        {productToDelete ? (
          <div className="grid gap-4">
            <div className="rounded-md border border-border bg-background p-3">
              <p className="font-bold text-foreground">{productToDelete.name}</p>
              <p className="numeric mt-1 text-xs font-semibold text-muted-foreground">{productToDelete.sku}</p>
            </div>
            <p className="text-sm font-semibold leading-6 text-muted-foreground">
              This product will be hidden from active inventory. Stock movement, sales, and audit history stay intact.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setProductToDelete(null)}>Cancel</Button>
              <Button className="text-panel" onClick={() => void deleteProduct()}>Delete Product</Button>
            </div>
          </div>
        ) : null}
      </Modal>
      <StockActionModal action={action} products={products} suppliers={suppliers} onClose={() => setAction(null)} onSaved={() => void load()} />
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

function ProductModal({ product, onClose, onSaved }: { product: ProductDto | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState<ProductCategory>("PROTEIN");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [threshold, setThreshold] = useState("0");

  useEffect(() => {
    if (product) {
      setName(product.name ?? "");
      setSku(product.sku ?? "");
      setDescription(product.description ?? "");
      setImageUrl(product.imageUrl ?? "");
      setCategory(product.category ?? "PROTEIN");
      setPrice(product.priceCents !== undefined ? (product.priceCents / 100).toFixed(2) : "");
      setCost(product.costCents !== undefined ? (product.costCents / 100).toFixed(2) : "");
      setThreshold(product.reorderThreshold?.toString() ?? "0");
    }
  }, [product]);

  const submit = async (): Promise<void> => {
    try {
      const payload = {
        name,
        sku,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}),
        category,
        priceCents: Math.round(Number(price) * 100),
        costCents: Math.round(Number(cost) * 100),
        reorderThreshold: Number(threshold)
      };
      if (product?.id) {
        await inventoryApi.updateProduct(product.id, payload);
      } else {
        await inventoryApi.createProduct(payload);
      }
      toast.success("Product saved");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save product"));
    }
  };

  return (
    <Modal title={product?.id ? "Edit Product" : "New Product"} open={!!product} onClose={onClose}>
      <div className="grid gap-3">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input label="SKU" value={sku} onChange={(event) => setSku(event.target.value)} />
        <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
          <span>Description</span>
          <textarea
            className="min-h-24 w-full resize-y rounded-md border border-border bg-surface/70 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <Input label="Image URL" type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
        <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
          <span>Category</span>
          <select className="h-11 w-full rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25" value={category} onChange={(event) => setCategory(event.target.value as ProductCategory)}>
            {productCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Price" type="number" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          <Input label="Cost" type="number" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} />
        </div>
        <Input label="Reorder threshold" type="number" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
        <Button onClick={() => void submit()}>Save Product</Button>
      </div>
    </Modal>
  );
}

function StockActionModal({
  action,
  products,
  suppliers,
  onClose,
  onSaved
}: {
  action: Action | null;
  products: ProductDto[];
  suppliers: SupplierDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [memberId, setMemberId] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [cost, setCost] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (action) {
      setProductId(products[0]?.id ?? "");
      setSupplierId("");
      setQuantity("1");
      setMemberId("");
      setCost("");
      setReference("");
    }
  }, [action, products]);

  const submit = async (): Promise<void> => {
    if (!action) return;
    try {
      if (action === "purchase") {
        await inventoryApi.recordPurchase({
          productId,
          ...(supplierId ? { supplierId } : {}),
          quantity: Number(quantity),
          ...(cost ? { unitCostCents: Math.round(Number(cost) * 100) } : {}),
          ...(reference ? { reference } : {})
        });
      } else if (action === "adjustment") {
        await inventoryApi.recordAdjustment({
          productId,
          quantity: Number(quantity),
          ...(reference ? { reference } : {})
        });
      } else {
        await inventoryApi.recordSale({
          productId,
          memberId,
          quantity: Number(quantity),
          method,
          ...(reference ? { reference } : {})
        });
      }
      toast.success("Stock movement recorded");
      onClose();
      onSaved();
    } catch (error) {
      const code = getApiErrorCode(error);
      toast.error(code === "INSUFFICIENT_STOCK" ? "Just sold out or not enough stock remains" : getApiErrorMessage(error, "Could not record movement"));
    }
  };

  return (
    <Modal title={action ? `${action.charAt(0).toUpperCase()}${action.slice(1)}` : "Stock"} open={!!action} onClose={onClose}>
      <div className="grid gap-3">
        <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
          <span>Product</span>
          <select className="h-11 w-full rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25" value={productId} onChange={(event) => setProductId(event.target.value)}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <Input label="Quantity" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
        {action === "purchase" ? (
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
            <span>Supplier</span>
            <select className="h-11 w-full rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">No supplier</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
        ) : null}
        {action === "sale" ? (
          <>
            <Input label="Member ID" value={memberId} onChange={(event) => setMemberId(event.target.value)} />
            <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground">
              <span>Payment method</span>
              <select className="h-11 w-full rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
                {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </>
        ) : null}
        {action === "purchase" ? <Input label="Unit cost" type="number" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} /> : null}
        <Input label={action === "adjustment" ? "Reason" : "Reference"} value={reference} onChange={(event) => setReference(event.target.value)} />
        <Button onClick={() => void submit()}>Record</Button>
      </div>
    </Modal>
  );
}
