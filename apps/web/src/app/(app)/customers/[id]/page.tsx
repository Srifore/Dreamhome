"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Customer, Interaction } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorMessage, Input, Label, PageHeader, QueryError, Select } from "@/components/ui";
import { INDIAN_STATES } from "@/lib/indian-states";

const TICKET_TONE: Record<string, "neutral" | "green" | "red" | "amber" | "blue"> = {
  OPEN: "amber",
  ASSIGNED: "blue",
  IN_PROGRESS: "blue",
  RESOLVED: "green",
  CLOSED: "neutral",
};

function CustomerTaxDetails({ customer, canEdit }: { customer: Customer; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [gstin, setGstin] = useState(customer.gstin ?? "");
  const [state, setState] = useState(customer.state ?? "");
  const [shippingAddress, setShippingAddress] = useState(customer.shippingAddress ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/crm/customers/${customer.id}`, {
        gstin: gstin || undefined,
        state: state || undefined,
        shippingAddress: shippingAddress || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", customer.id] });
      setEditing(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to update tax details"),
  });

  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Billing / GST Details</h2>
        {canEdit && !editing && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>
      {!editing ? (
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500">GSTIN</dt>
            <dd>{customer.gstin ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">State</dt>
            <dd>{customer.state ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Shipping Address</dt>
            <dd>{customer.shippingAddress ?? "Same as billing"}</dd>
          </div>
        </dl>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>GSTIN</Label>
              <Input value={gstin} onChange={(e) => setGstin(e.target.value)} />
            </div>
            <div>
              <Label>State</Label>
              <Select value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Shipping Address (if different from billing)</Label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
            />
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

function LogInteractionForm({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ type: "NOTE", subject: "", body: "" });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Interaction>("/crm/interactions", {
        type: form.type,
        subject: form.subject || undefined,
        body: form.body || undefined,
        customerId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", customerId] });
      setForm({ type: "NOTE", subject: "", body: "" });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to log interaction"),
  });

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
      className="space-y-2"
    >
      <div className="flex gap-2">
        <Input
          placeholder="Subject"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <Button type="submit" disabled={mutation.isPending} className="shrink-0">
          {mutation.isPending ? "Saving…" : "Log Note"}
        </Button>
      </div>
      <Input
        placeholder="Details…"
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
      />
      {error && <ErrorMessage message={error} />}
    </form>
  );
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasPermission } = useAuth();
  const customer = useQuery({
    queryKey: ["customers", id],
    queryFn: () => api.get<Customer>(`/crm/customers/${id}`),
  });

  if (customer.isLoading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (customer.isError) {
    const notFound = customer.error instanceof ApiError && customer.error.status === 404;
    return notFound ? (
      <p className="text-sm text-neutral-500">Customer not found.</p>
    ) : (
      <QueryError error={customer.error} onRetry={() => customer.refetch()} />
    );
  }
  if (!customer.data) return <p className="text-sm text-neutral-500">Customer not found.</p>;

  const c = customer.data;

  return (
    <div className="max-w-3xl">
      <PageHeader title={c.name} />

      <Card className="mb-6">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-neutral-500">Phone</dt>
            <dd>{c.phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Email</dt>
            <dd>{c.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Loyalty Points</dt>
            <dd>{c.loyaltyPoints}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Source</dt>
            <dd>{c.source ?? "—"}</dd>
          </div>
        </dl>
      </Card>

      <CustomerTaxDetails customer={c} canEdit={hasPermission("crm:write")} />

      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Purchase History</h2>
      {c.productUnits?.length ? (
        <Card className="mb-6 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Serial No.</th>
                <th className="px-4 py-2">Sold</th>
                <th className="px-4 py-2">Warranty Until</th>
              </tr>
            </thead>
            <tbody>
              {c.productUnits.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2">
                    {u.product?.brand?.name} {u.product?.name}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{u.serialNumber}</td>
                  <td className="px-4 py-2">{u.soldAt ? new Date(u.soldAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-2">
                    {u.warrantyExpiresAt ? new Date(u.warrantyExpiresAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="mb-6">
          <EmptyState message="No purchases recorded yet." />
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Service History</h2>
      {c.serviceTickets?.length ? (
        <Card className="mb-6 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Issue</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {c.serviceTickets.map((t) => (
                <tr key={t.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2">{t.issueDescription}</td>
                  <td className="px-4 py-2">
                    <Badge tone={TICKET_TONE[t.status] ?? "neutral"}>{t.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="mb-6">
          <EmptyState message="No service tickets yet." />
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Sales Orders</h2>
      {c.salesOrders?.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Order #</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {c.salesOrders.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2">
                    <Link href={`/orders/${o.id}`} className="font-medium text-neutral-900 hover:underline">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone="blue">{o.status}</Badge>
                  </td>
                  <td className="px-4 py-2">₹{Number(o.total).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState message="No sales orders yet." />
      )}

      <h2 className="mb-3 mt-6 text-sm font-semibold text-neutral-900">Interactions</h2>
      <Card className="space-y-4">
        {hasPermission("crm:write") && <LogInteractionForm customerId={id} />}
        {c.interactions?.length ? (
          <ul className="space-y-2 border-t border-neutral-100 pt-3 text-sm">
            {c.interactions.map((i) => (
              <li key={i.id}>
                <p className="font-medium">
                  {i.subject ?? i.type} <span className="text-xs font-normal text-neutral-400">· {i.type}</span>
                </p>
                {i.body && <p className="text-neutral-500">{i.body}</p>}
                <p className="text-xs text-neutral-400">{new Date(i.occurredAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No interactions logged yet.</p>
        )}
      </Card>
    </div>
  );
}
