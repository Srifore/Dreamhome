"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Brand, Category, Product } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  Label,
  Modal,
  PageHeader,
  QueryError,
  Select,
} from "@/components/ui";

const GST_RATES = [0, 5, 12, 18, 28];

function EditIconButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Edit product"
      title="Edit product"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        />
      </svg>
    </Link>
  );
}

function DeleteIconButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Delete product"
      title="Delete product"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a2 2 0 0 1-2 1.9H8.7a2 2 0 0 1-2-1.9L6 7h12Z"
        />
      </svg>
    </button>
  );
}

function BrandQuickAdd({ onCreated }: { onCreated: (brand: Brand) => void }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post<Brand>("/inventory/brands", { name }),
    onSuccess: (brand) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      setName("");
      setOpen(false);
      onCreated(brand);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create brand"),
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-xs font-medium text-neutral-500 hover:text-neutral-900"
      >
        + Add a new brand
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-start gap-2 rounded-md border border-neutral-200 p-2">
      <div className="flex-1">
        <Input
          autoFocus
          placeholder="Brand name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <Button
        type="button"
        onClick={() => {
          setError(null);
          mutation.mutate();
        }}
        disabled={!name.trim() || mutation.isPending}
      >
        {mutation.isPending ? "Adding…" : "Add"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </div>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function CategoryRow({ category, topLevel }: { category: Category; topLevel: Category[] }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [parentId, setParentId] = useState(category.parentId ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/inventory/categories/${category.id}`, { name, slug, parentId: parentId || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditing(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to update category"),
  });

  const parentName = topLevel.find((c) => c.id === category.parentId)?.name;

  if (!editing) {
    return (
      <tr className="border-b border-neutral-100 last:border-0">
        <td className="px-4 py-2">{category.name}</td>
        <td className="px-4 py-2 text-xs text-neutral-500">{category.slug}</td>
        <td className="px-4 py-2 text-xs text-neutral-500">{parentName ?? "— (top-level)"}</td>
        <td className="px-4 py-2 text-right">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0 bg-neutral-50">
      <td className="px-4 py-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="px-4 py-2">
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
      </td>
      <td className="px-4 py-2">
        <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">— (top-level)</option>
          {topLevel
            .filter((c) => c.id !== category.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        <Button onClick={() => mutation.mutate()} disabled={!name.trim() || !slug.trim() || mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" className="ml-2" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </td>
    </tr>
  );
}

function ManageCategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/inventory/categories"),
    enabled: open,
  });
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const topLevel = categories.data?.filter((c) => !c.parentId) ?? [];

  const create = useMutation({
    mutationFn: () =>
      api.post<Category>("/inventory/categories", {
        name: newName,
        slug: slugify(newName),
        parentId: newParentId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
      setNewParentId("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create category"),
  });

  return (
    <Modal open={open} onClose={onClose} title="Manage Categories">
      <div className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <Label>New Category Name</Label>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Air Conditioners" />
        </div>
        <div className="flex-1">
          <Label>Parent Pillar</Label>
          <Select value={newParentId} onChange={(e) => setNewParentId(e.target.value)}>
            <option value="">— (new top-level pillar)</option>
            {topLevel.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          onClick={() => {
            setError(null);
            create.mutate();
          }}
          disabled={!newName.trim() || create.isPending}
        >
          {create.isPending ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {categories.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {categories.isError && <QueryError error={categories.error} onRetry={() => categories.refetch()} />}
      {!!categories.data?.length && (
        <div className="max-h-96 overflow-y-auto rounded-md border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">Parent</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {categories.data.map((c) => (
                <CategoryRow key={c.id} category={c} topLevel={topLevel} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function CreateProductForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => api.get<Brand[]>("/inventory/brands") });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/inventory/categories"),
  });

  const [form, setForm] = useState({
    sku: "",
    name: "",
    brandId: "",
    categoryId: "",
    modelNumber: "",
    price: "",
    hsnCode: "",
    gstRate: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Product>("/inventory/products", {
        sku: form.sku,
        name: form.name,
        brandId: form.brandId,
        categoryId: form.categoryId,
        modelNumber: form.modelNumber || undefined,
        price: Number(form.price),
        hsnCode: form.hsnCode || undefined,
        gstRate: form.gstRate === "" ? undefined : Number(form.gstRate),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create product"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label>SKU</Label>
        <Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
      </div>
      <div>
        <Label>Name</Label>
        <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <Label>Brand</Label>
        <Select
          required
          value={form.brandId}
          onChange={(e) => setForm({ ...form, brandId: e.target.value })}
        >
          <option value="">Select a brand</option>
          {brands.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <BrandQuickAdd onCreated={(brand) => setForm((prev) => ({ ...prev, brandId: brand.id }))} />
      </div>
      <div>
        <Label>Category</Label>
        <Select
          required
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          <option value="">Select a category</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Model number</Label>
        <Input
          value={form.modelNumber}
          onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
        />
      </div>
      <div>
        <Label>Price (₹)</Label>
        <Input
          type="number"
          min="0"
          required
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
      </div>
      <div>
        <Label>HSN Code</Label>
        <Input value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} />
      </div>
      <div>
        <Label>GST Rate</Label>
        <Select value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: e.target.value })}>
          <option value="">Not set</option>
          {GST_RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate}%
            </option>
          ))}
        </Select>
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Creating…" : "Create Product"}
      </Button>
    </form>
  );
}

function BrandRow({ brand }: { brand: Brand }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(brand.name);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.patch(`/inventory/brands/${brand.id}`, { name, logoUrl: logoUrl || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      setEditing(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to update brand"),
  });

  if (!editing) {
    return (
      <tr className="border-b border-neutral-100 last:border-0">
        <td className="px-4 py-2">{brand.name}</td>
        <td className="px-4 py-2 text-xs text-neutral-500">{brand.logoUrl ?? "—"}</td>
        <td className="px-4 py-2 text-right">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-neutral-100 last:border-0 bg-neutral-50">
      <td className="px-4 py-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="px-4 py-2">
        <Input
          placeholder="Logo URL (optional)"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        <Button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" className="ml-2" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </td>
    </tr>
  );
}

function ManageBrandsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const brands = useQuery({
    queryKey: ["brands"],
    queryFn: () => api.get<Brand[]>("/inventory/brands"),
    enabled: open,
  });
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => api.post<Brand>("/inventory/brands", { name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      setNewName("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create brand"),
  });

  return (
    <Modal open={open} onClose={onClose} title="Manage Brands">
      <div className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <Label>New Brand Name</Label>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. LG" />
        </div>
        <Button
          onClick={() => {
            setError(null);
            create.mutate();
          }}
          disabled={!newName.trim() || create.isPending}
        >
          {create.isPending ? "Adding…" : "Add Brand"}
        </Button>
      </div>
      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {brands.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {brands.isError && <QueryError error={brands.error} onRetry={() => brands.refetch()} />}
      {!!brands.data?.length && (
        <div className="max-h-96 overflow-y-auto rounded-md border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Logo URL</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {brands.data.map((b) => (
                <BrandRow key={b.id} brand={b} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("inventory:write");
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [brandsModalOpen, setBrandsModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/inventory/products") });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/products/${id}`),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Failed to delete product"),
  });

  function handleDelete(p: Product) {
    if (!confirm(`Delete ${p.name}? This cannot be undone.`)) return;
    deleteProduct.mutate(p.id);
  }

  return (
    <div>
      <PageHeader
        title="Products"
        action={
          canEdit && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setBrandsModalOpen(true)}>
                Manage Brands
              </Button>
              <Button variant="secondary" onClick={() => setCategoriesModalOpen(true)}>
                Manage Categories
              </Button>
              <Button onClick={() => setModalOpen(true)}>New Product</Button>
            </div>
          )
        }
      />

      {products.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {products.isError && <QueryError error={products.error} onRetry={() => products.refetch()} />}
      {products.data?.length === 0 && <EmptyState message="No products yet." />}
      {actionError && <ErrorMessage message={actionError} />}

      {!!products.data?.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Brand</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {products.data.map((p) => {
                const totalStock = p.stockLevels?.reduce((sum, s) => sum + s.quantity, 0) ?? 0;
                return (
                  <tr key={p.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-2">
                      <Link href={`/products/${p.id}`} className="font-medium text-neutral-900 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{p.brand?.name}</td>
                    <td className="px-4 py-2">{p.category?.name}</td>
                    <td className="px-4 py-2">₹{Number(p.price).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2">
                      <Badge tone={p.status === "ACTIVE" ? "green" : "neutral"}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-2">{totalStock}</td>
                    <td className="px-4 py-2">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-2">
                          <EditIconButton href={`/products/${p.id}`} />
                          <DeleteIconButton onClick={() => handleDelete(p)} disabled={deleteProduct.isPending} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Product">
        <CreateProductForm onDone={() => setModalOpen(false)} />
      </Modal>

      <ManageBrandsModal open={brandsModalOpen} onClose={() => setBrandsModalOpen(false)} />
      <ManageCategoriesModal open={categoriesModalOpen} onClose={() => setCategoriesModalOpen(false)} />
    </div>
  );
}
