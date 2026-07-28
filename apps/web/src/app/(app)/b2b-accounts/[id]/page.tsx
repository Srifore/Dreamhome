"use client";

import { use, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { B2BAccount, B2BContact, Interaction } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorMessage, Input, Label, PageHeader, QueryError, Select } from "@/components/ui";
import { INDIAN_STATES } from "@/lib/indian-states";

function B2BAccountTaxDetails({ account, canEdit }: { account: B2BAccount; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [gstin, setGstin] = useState(account.gstin ?? "");
  const [state, setState] = useState(account.state ?? "");
  const [shippingAddress, setShippingAddress] = useState(account.shippingAddress ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/crm/b2b-accounts/${account.id}`, {
        gstin: gstin || undefined,
        state: state || undefined,
        shippingAddress: shippingAddress || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-accounts", account.id] });
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
            <dd>{account.gstin ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">State</dt>
            <dd>{account.state ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Shipping Address</dt>
            <dd>{account.shippingAddress ?? "Same as billing"}</dd>
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

function AddContactForm({ b2bAccountId }: { b2bAccountId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "" });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<B2BContact>(`/crm/b2b-accounts/${b2bAccountId}/contacts`, {
        name: form.name,
        role: form.role || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-accounts", b2bAccountId] });
      setForm({ name: "", role: "", phone: "", email: "" });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to add contact"),
  });

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="w-40">
        <Label>Name</Label>
        <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="w-32">
        <Label>Role</Label>
        <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
      </div>
      <div className="w-36">
        <Label>Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="w-44">
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Adding…" : "Add Contact"}
      </Button>
      {error && <ErrorMessage message={error} />}
    </form>
  );
}

function LogInteractionForm({ b2bAccountId }: { b2bAccountId: string }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ type: "NOTE", subject: "", body: "" });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Interaction>("/crm/interactions", {
        type: form.type,
        subject: form.subject || undefined,
        body: form.body || undefined,
        b2bAccountId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-accounts", b2bAccountId] });
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

export default function B2BAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasPermission } = useAuth();
  const account = useQuery({
    queryKey: ["b2b-accounts", id],
    queryFn: () => api.get<B2BAccount>(`/crm/b2b-accounts/${id}`),
  });

  if (account.isLoading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (account.isError) {
    const notFound = account.error instanceof ApiError && account.error.status === 404;
    return notFound ? (
      <p className="text-sm text-neutral-500">Account not found.</p>
    ) : (
      <QueryError error={account.error} onRetry={() => account.refetch()} />
    );
  }
  if (!account.data) return <p className="text-sm text-neutral-500">Account not found.</p>;

  const a = account.data;

  return (
    <div className="max-w-3xl">
      <PageHeader title={a.name} />

      <Card className="mb-6">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500">Type</dt>
            <dd>
              <Badge tone="blue">{a.type}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Owner</dt>
            <dd>{a.owner?.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500">Address</dt>
            <dd>{a.address ?? "—"}</dd>
          </div>
        </dl>
      </Card>

      <B2BAccountTaxDetails account={a} canEdit={hasPermission("crm:write")} />

      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Contacts</h2>
      <Card className="mb-6 space-y-4">
        {a.contacts?.length ? (
          <ul className="space-y-1 text-sm">
            {a.contacts.map((c) => (
              <li key={c.id}>
                <span className="font-medium">{c.name}</span>
                {c.role && <span className="text-neutral-500"> · {c.role}</span>}
                {c.phone && <span className="text-neutral-500"> · {c.phone}</span>}
                {c.email && <span className="text-neutral-500"> · {c.email}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No contacts yet.</p>
        )}
        {hasPermission("crm:write") && <AddContactForm b2bAccountId={id} />}
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Opportunities</h2>
      {a.opportunities?.length ? (
        <Card className="mb-6 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Est. Value</th>
              </tr>
            </thead>
            <tbody>
              {a.opportunities.map((o) => (
                <tr key={o.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2">{o.title}</td>
                  <td className="px-4 py-2">
                    <Badge tone="amber">{o.stage}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    {o.estimatedValue ? `₹${Number(o.estimatedValue).toLocaleString("en-IN")}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="mb-6">
          <EmptyState message="No opportunities yet." />
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-neutral-900">Interactions</h2>
      <Card className="space-y-4">
        {hasPermission("crm:write") && <LogInteractionForm b2bAccountId={id} />}
        {a.interactions?.length ? (
          <ul className="space-y-2 border-t border-neutral-100 pt-3 text-sm">
            {a.interactions.map((i) => (
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
