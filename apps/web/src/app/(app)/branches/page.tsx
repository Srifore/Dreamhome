"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Branch } from "@/lib/types";
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
} from "@/components/ui";

function CreateBranchForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", address: "", city: "", phone: "" });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Branch>("/branches", {
        name: form.name,
        address: form.address,
        city: form.city,
        phone: form.phone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create branch"),
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
        <Label>Address</Label>
        <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div>
        <Label>City</Label>
        <Input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <div>
        <Label>Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Creating…" : "Create Branch"}
      </Button>
    </form>
  );
}

function BranchRow({ branch }: { branch: Branch }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: branch.name,
    address: branch.address,
    city: branch.city,
    phone: branch.phone ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/branches/${branch.id}`, {
        name: form.name,
        address: form.address,
        city: form.city,
        phone: form.phone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setEditing(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to update branch"),
  });

  if (!editing) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{branch.name}</p>
          <p className="text-xs text-slate-500">
            {branch.address}, {branch.city}
          </p>
          {branch.phone && <p className="text-xs text-slate-500">{branch.phone}</p>}
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div>
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <Label>Address</Label>
        <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div>
        <Label>City</Label>
        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </div>
      <div>
        <Label>Phone</Label>
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      {error && <ErrorMessage message={error} />}
      <div className="flex gap-2">
        <Button
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

export default function BranchesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("branches:manage");
  const [modalOpen, setModalOpen] = useState(false);
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => api.get<Branch[]>("/branches") });

  return (
    <div>
      <PageHeader
        title="Branches"
        action={canEdit && <Button onClick={() => setModalOpen(true)}>New Branch</Button>}
      />

      {branches.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {branches.isError && <QueryError error={branches.error} onRetry={() => branches.refetch()} />}
      {branches.data?.length === 0 && <EmptyState message="No branches yet." />}

      <div className="space-y-2">
        {branches.data?.map((branch) =>
          canEdit ? (
            <BranchRow key={branch.id} branch={branch} />
          ) : (
            <Card key={branch.id}>
              <p className="text-sm font-medium text-slate-900">{branch.name}</p>
              <p className="text-xs text-slate-500">
                {branch.address}, {branch.city}
              </p>
              {branch.phone && <p className="text-xs text-slate-500">{branch.phone}</p>}
            </Card>
          ),
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Branch">
        <CreateBranchForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
