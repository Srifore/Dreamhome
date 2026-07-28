"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Customer } from "@/lib/types";
import {
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
import { INDIAN_STATES } from "@/lib/indian-states";

function CreateCustomerForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    state: "",
    shippingAddress: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Customer>("/crm/customers", {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        address: form.address || undefined,
        gstin: form.gstin || undefined,
        state: form.state || undefined,
        shippingAddress: form.shippingAddress || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create customer"),
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
        <Label>Phone</Label>
        <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div>
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
        {mutation.isPending ? "Creating…" : "Create Customer"}
      </Button>
    </form>
  );
}

export default function CustomersPage() {
  const { hasPermission } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.get<Customer[]>("/crm/customers") });

  return (
    <div>
      <PageHeader
        title="Customers"
        action={hasPermission("crm:write") && <Button onClick={() => setModalOpen(true)}>New Customer</Button>}
      />

      {customers.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {customers.isError && <QueryError error={customers.error} onRetry={() => customers.refetch()} />}
      {customers.data?.length === 0 && <EmptyState message="No customers yet." />}

      {!!customers.data?.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Loyalty Points</th>
                <th className="px-4 py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {customers.data.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/customers/${c.id}`} className="font-medium text-neutral-900 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{c.phone}</td>
                  <td className="px-4 py-2">{c.email ?? "—"}</td>
                  <td className="px-4 py-2">{c.loyaltyPoints}</td>
                  <td className="px-4 py-2">{c.source ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Customer">
        <CreateCustomerForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
