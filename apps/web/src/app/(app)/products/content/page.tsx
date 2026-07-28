"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Product } from "@/lib/types";
import {
  AccessRestricted,
  Badge,
  Card,
  Button,
  EmptyState,
  Modal,
  PageHeader,
  QueryError,
} from "@/components/ui";
import { ProductContentEditor, getMissingContentFields } from "@/components/product-content-editor";

/**
 * A focused workflow for filling in the website content (image, description, features, manual)
 * of products that already exist in inventory — separate from "New Product" (SKU/price/stock),
 * which is a different concern. A product only appears on the public website once all four
 * fields here are complete, so this page exists to make that checklist visible at a glance.
 */
export default function ProductContentPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("inventory:write");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/inventory/products") });
  // Derived from the live query result (not a snapshot) so the modal reflects newly
  // uploaded images/description/etc. immediately after each save, without going stale.
  const selected = products.data?.find((p) => p.id === selectedId) ?? null;

  if (!canEdit) {
    return (
      <div>
        <PageHeader title="Add Product Content" />
        <AccessRestricted feature="Product Content" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Add Product Content" />
      <p className="mb-6 -mt-4 text-sm text-slate-500">
        Pick an existing product and fill in its image, description, features/advantages, and manual.
        A product only appears on the public website once the description, features, and manual are
        complete — a photo is optional and shows a brand tile until you add one.
      </p>

      {products.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {products.isError && <QueryError error={products.error} onRetry={() => products.refetch()} />}
      {products.data?.length === 0 && <EmptyState message="No products yet." />}

      {!!products.data?.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Brand</th>
                <th className="px-4 py-2">Website Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {products.data.map((p) => {
                const missing = getMissingContentFields(p);
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">{p.name}</td>
                    <td className="px-4 py-2">{p.brand?.name}</td>
                    <td className="px-4 py-2">
                      {missing.length === 0 ? (
                        <Badge tone="green">Live on website</Badge>
                      ) : (
                        <Badge tone="amber">Missing: {missing.join(", ")}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="secondary" onClick={() => setSelectedId(p.id)}>
                        {missing.length === 0 ? "Edit Content" : "Add Content"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={selected !== null} onClose={() => setSelectedId(null)} title={selected?.name ?? ""}>
        {selected && <ProductContentEditor key={selected.id} product={selected} />}
      </Modal>
    </div>
  );
}
