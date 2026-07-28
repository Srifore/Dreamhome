"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProductReview } from "@/lib/types";
import { Badge, Card, EmptyState, PageHeader, QueryError } from "@/components/ui";
import { productLabel } from "@/lib/product-label";

/**
 * Reviews are captured automatically by the WhatsApp bot's post-purchase check-in (see
 * AutoReplyService.checkInOnLatestPurchase on the API) — there's nothing for staff to create
 * here, just what customers have said about their purchases so far.
 */
export default function ReviewsPage() {
  const reviews = useQuery({
    queryKey: ["reviews"],
    queryFn: () => api.get<ProductReview[]>("/crm/reviews"),
  });

  return (
    <div>
      <PageHeader title="User Reviews" />

      {reviews.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {reviews.isError && <QueryError error={reviews.error} onRetry={() => reviews.refetch()} />}
      {reviews.data?.length === 0 && (
        <EmptyState message="No reviews yet — these are collected automatically when returning customers reply to the WhatsApp bot's check-in." />
      )}

      {!!reviews.data?.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Rating</th>
                <th className="px-4 py-2">Comment</th>
                <th className="px-4 py-2">Requested</th>
                <th className="px-4 py-2">Responded</th>
              </tr>
            </thead>
            <tbody>
              {reviews.data.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <p className="font-medium text-slate-900">{r.customer?.name}</p>
                    <p className="text-xs text-slate-500">{r.customer?.phone}</p>
                  </td>
                  <td className="px-4 py-2">{productLabel(r.product)}</td>
                  <td className="px-4 py-2">
                    <Badge tone={r.status === "RECEIVED" ? "green" : "amber"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-2">{r.rating ? `${r.rating} / 5` : "—"}</td>
                  <td className="px-4 py-2 max-w-xs">{r.comment ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {new Date(r.requestedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {r.respondedAt ? new Date(r.respondedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
