"use client";

import { use, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Branch, Brand, Category, Product } from "@/lib/types";
import { Badge, Button, Card, ErrorMessage, Input, Label, PageHeader, QueryError, Select } from "@/components/ui";
import { ProductContentEditor } from "@/components/product-content-editor";

const GST_RATES = [0, 5, 12, 18, 28];
const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "DISCONTINUED"];

function ProductInfoEditor({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api.get<Brand[]>("/inventory/brands") });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/inventory/categories"),
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    sku: product.sku,
    name: product.name,
    brandId: product.brandId,
    categoryId: product.categoryId,
    modelNumber: product.modelNumber ?? "",
    price: String(product.price),
    status: product.status,
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/inventory/products/${product.id}`, {
        sku: form.sku,
        name: form.name,
        brandId: form.brandId,
        categoryId: form.categoryId,
        modelNumber: form.modelNumber || undefined,
        price: Number(form.price),
        status: form.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", product.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditing(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to update product"),
  });

  if (!editing) {
    return (
      <Card className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Product Info</h2>
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500">SKU</dt>
            <dd className="font-mono">{product.sku}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Brand</dt>
            <dd>{product.brand?.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Category</dt>
            <dd>{product.category?.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Model</dt>
            <dd>{product.modelNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Price</dt>
            <dd>₹{Number(product.price).toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Status</dt>
            <dd>
              <Badge tone={product.status === "ACTIVE" ? "green" : "neutral"}>{product.status}</Badge>
            </dd>
          </div>
        </dl>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Product Info</h2>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>SKU</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <Label>Brand</Label>
            <Select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
              {brands.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Model number</Label>
            <Input value={form.modelNumber} onChange={(e) => setForm({ ...form, modelNumber: e.target.value })} />
          </div>
          <div>
            <Label>Price (₹)</Label>
            <Input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Product["status"] })}
            >
              {PRODUCT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {error && <ErrorMessage message={error} />}
        <div className="flex gap-2">
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.name.trim() || !form.sku.trim() || mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ProductTaxDetails({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [hsnCode, setHsnCode] = useState(product.hsnCode ?? "");
  const [gstRate, setGstRate] = useState(product.gstRate ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/inventory/products/${product.id}`, {
        hsnCode: hsnCode || undefined,
        gstRate: gstRate === "" ? undefined : Number(gstRate),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", product.id] });
      setEditing(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to update tax details"),
  });

  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Tax Details</h2>
        {!editing && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
      {!editing ? (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-neutral-500">HSN Code</dt>
            <dd>{product.hsnCode ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">GST Rate</dt>
            <dd>{product.gstRate ? `${Number(product.gstRate)}%` : "—"}</dd>
          </div>
        </dl>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>HSN Code</Label>
              <Input value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} />
            </div>
            <div>
              <Label>GST Rate</Label>
              <Select value={gstRate} onChange={(e) => setGstRate(e.target.value)}>
                <option value="">Not set</option>
                {GST_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {error && <ErrorMessage message={error} />}
          <div className="flex gap-2">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [deleted, setDeleted] = useState(false);
  const product = useQuery({
    queryKey: ["products", id],
    queryFn: () => api.get<Product>(`/inventory/products/${id}`),
    enabled: !deleted,
  });
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => api.get<Branch[]>("/branches") });

  const [branchId, setBranchId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const setStock = useMutation({
    mutationFn: () =>
      api.post("/inventory/stock/set", { productId: id, branchId, quantity: Number(quantity) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setQuantity("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to update stock"),
  });

  const deleteProduct = useMutation({
    mutationFn: () => api.delete(`/inventory/products/${id}`),
    onSuccess: () => {
      // Disable this query before touching the cache — invalidating ["products"] would otherwise
      // also mark this still-mounted ["products", id] query stale and refetch a product that's
      // already gone (a 404) right before the page navigates away.
      setDeleted(true);
      queryClient.removeQueries({ queryKey: ["products", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      router.push("/products");
    },
    onError: (err) => setDeleteError(err instanceof ApiError ? err.message : "Failed to delete product"),
  });

  if (product.isLoading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (product.isError) {
    const notFound = product.error instanceof ApiError && product.error.status === 404;
    return notFound ? (
      <p className="text-sm text-neutral-500">Product not found.</p>
    ) : (
      <QueryError error={product.error} onRetry={() => product.refetch()} />
    );
  }
  if (!product.data) return <p className="text-sm text-neutral-500">Product not found.</p>;

  const p = product.data;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={p.name}
        action={
          hasPermission("inventory:write") && (
            <Button
              variant="danger"
              disabled={deleteProduct.isPending}
              onClick={() => {
                if (!confirm(`Delete ${p.name}? This cannot be undone.`)) return;
                deleteProduct.mutate();
              }}
            >
              {deleteProduct.isPending ? "Deleting…" : "Delete Product"}
            </Button>
          )
        }
      />
      {deleteError && (
        <div className="mb-6">
          <ErrorMessage message={deleteError} />
        </div>
      )}

      <ProductInfoEditor product={p} />

      {hasPermission("inventory:write") && <ProductTaxDetails product={p} />}

      {hasPermission("inventory:write") && <ProductContentEditor key={p.id} product={p} />}

      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Stock by Branch</h2>
      <Card className="mb-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
            <tr>
              <th className="px-4 py-2">Branch</th>
              <th className="px-4 py-2">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {p.stockLevels?.length ? (
              p.stockLevels.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2">{s.branch?.name}</td>
                  <td className="px-4 py-2">{s.quantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-3 text-neutral-500" colSpan={2}>
                  No stock recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {hasPermission("inventory:write") && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Set Stock Level</h2>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              setError(null);
              setStock.mutate();
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="w-48">
              <Label>Branch</Label>
              <Select required value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">Select branch</option>
                {branches.data?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-32">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={setStock.isPending}>
              {setStock.isPending ? "Saving…" : "Save"}
            </Button>
          </form>
          {error && (
            <div className="mt-3">
              <ErrorMessage message={error} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
