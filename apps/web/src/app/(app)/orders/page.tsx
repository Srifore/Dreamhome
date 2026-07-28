"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SalesOrder } from "@/lib/types";
import { Badge, Card, EmptyState, PageHeader, QueryError } from "@/components/ui";

export default function OrdersPage() {
  const orders = useQuery({ queryKey: ["orders"], queryFn: () => api.get<SalesOrder[]>("/sales/orders") });

  return (
    <div>
      <PageHeader title="Sales Orders" />

      {orders.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {orders.isError && <QueryError error={orders.error} onRetry={() => orders.refetch()} />}
      {orders.data?.length === 0 && (
        <EmptyState message="No sales orders yet. Confirm a quote to create one." />
      )}

      {!!orders.data?.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Order #</th>
                <th className="px-4 py-2">Customer / Account</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/orders/${o.id}`} className="font-medium text-neutral-900 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{o.customer?.name ?? o.b2bAccount?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge tone="blue">{o.status}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {o.invoice ? (
                      <Badge tone={o.invoice.status === "PAID" ? "green" : o.invoice.status === "OVERDUE" ? "red" : "amber"}>
                        {o.invoice.status}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2">₹{Number(o.total).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
