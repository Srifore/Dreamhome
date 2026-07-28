"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { B2BAccount, B2BAccountType } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorMessage, Input, Label, Modal, PageHeader, QueryError, Select } from "@/components/ui";
import { INDIAN_STATES } from "@/lib/indian-states";

const TYPE_LABELS: Record<B2BAccountType, string> = {
  ARCHITECT: "Architect",
  INTERIOR_DESIGNER: "Interior Designer",
  BUILDER: "Builder",
  DEVELOPER: "Developer",
};

function CreateB2BAccountForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{
    name: string;
    type: B2BAccountType;
    address: string;
    gstin: string;
    state: string;
    shippingAddress: string;
  }>({
    name: "",
    type: "ARCHITECT",
    address: "",
    gstin: "",
    state: "",
    shippingAddress: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<B2BAccount>("/crm/b2b-accounts", {
        name: form.name,
        type: form.type,
        address: form.address || undefined,
        gstin: form.gstin || undefined,
        state: form.state || undefined,
        shippingAddress: form.shippingAddress || undefined,
        ownerId: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b-accounts"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create account"),
  });

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
      className="space-y-3"
    >
      <div>
        <Label>Name</Label>
        <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <Label>Type</Label>
        <Select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as B2BAccountType })}
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Billing Address</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div>
        <Label>Shipping Address (if different)</Label>
        <textarea
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          value={form.shippingAddress}
          onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
        />
      </div>
      <div>
        <Label>State</Label>
        <Select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
          <option value="">Select state</option>
          {INDIAN_STATES.map((s) => (
            <option key={s.code} value={s.name}>
              {s.name} ({s.code})
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>GSTIN</Label>
        <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Creating…" : "Create Account"}
      </Button>
    </form>
  );
}

export default function B2BAccountsPage() {
  const { hasPermission } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const accounts = useQuery({
    queryKey: ["b2b-accounts"],
    queryFn: () => api.get<B2BAccount[]>("/crm/b2b-accounts"),
  });

  return (
    <div>
      <PageHeader
        title="B2B Accounts"
        action={hasPermission("crm:write") && <Button onClick={() => setModalOpen(true)}>New Account</Button>}
      />

      {accounts.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {accounts.isError && <QueryError error={accounts.error} onRetry={() => accounts.refetch()} />}
      {accounts.data?.length === 0 && <EmptyState message="No B2B accounts yet." />}

      {!!accounts.data?.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Owner</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data.map((a) => (
                <tr key={a.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/b2b-accounts/${a.id}`} className="font-medium text-neutral-900 hover:underline">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone="blue">{TYPE_LABELS[a.type]}</Badge>
                  </td>
                  <td className="px-4 py-2">{a.owner?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New B2B Account">
        <CreateB2BAccountForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
