"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { OPPORTUNITY_STAGES, type B2BAccount, type Opportunity, type OpportunityStage } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, Label, Modal, PageHeader, QueryError, Select } from "@/components/ui";

const STAGE_LABELS: Record<OpportunityStage, string> = {
  CONSULTATION: "Consultation",
  DESIGN_SUPPORT: "Design Support",
  PRODUCT_SELECTION: "Product Selection",
  INSTALLATION: "Installation",
  AFTER_SALES: "After-Sales",
  LOST: "Lost",
};

function CreateOpportunityForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const b2bAccounts = useQuery({
    queryKey: ["b2b-accounts"],
    queryFn: () => api.get<B2BAccount[]>("/crm/b2b-accounts"),
  });
  const [form, setForm] = useState({ title: "", b2bAccountId: "", estimatedValue: "" });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Opportunity>("/crm/opportunities", {
        title: form.title,
        b2bAccountId: form.b2bAccountId,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        ownerId: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create opportunity"),
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
        <Label>Title</Label>
        <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <Label>B2B Account</Label>
        <Select
          required
          value={form.b2bAccountId}
          onChange={(e) => setForm({ ...form, b2bAccountId: e.target.value })}
        >
          <option value="">Select an account</option>
          {b2bAccounts.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Estimated Value (₹)</Label>
        <Input
          type="number"
          min="0"
          value={form.estimatedValue}
          onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Creating…" : "Create Opportunity"}
      </Button>
    </form>
  );
}

function EditOpportunityForm({ opportunity, onDone }: { opportunity: Opportunity; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(opportunity.title);
  const [estimatedValue, setEstimatedValue] = useState(opportunity.estimatedValue ?? "");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/crm/opportunities/${opportunity.id}`, {
        title,
        estimatedValue: estimatedValue ? Number(estimatedValue) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to update opportunity"),
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
        <Label>Title</Label>
        <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label>Estimated Value (₹)</Label>
        <Input
          type="number"
          min="0"
          value={estimatedValue}
          onChange={(e) => setEstimatedValue(e.target.value)}
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}

function OpportunityCard({ opportunity, canEdit }: { opportunity: Opportunity; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const updateStage = useMutation({
    mutationFn: (stage: OpportunityStage) => api.patch(`/crm/opportunities/${opportunity.id}`, { stage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["opportunities"] }),
  });

  return (
    <Card className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-neutral-900">{opportunity.title}</p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="shrink-0 text-xs font-medium text-sky-600 hover:underline"
          >
            Edit
          </button>
        )}
      </div>
      {opportunity.b2bAccount && (
        <Link
          href={`/b2b-accounts/${opportunity.b2bAccount.id}`}
          className="block text-xs text-sky-600 hover:underline"
        >
          {opportunity.b2bAccount.name}
        </Link>
      )}
      {opportunity.estimatedValue && (
        <p className="text-xs text-neutral-400">
          ₹{Number(opportunity.estimatedValue).toLocaleString("en-IN")}
        </p>
      )}
      <Select
        value={opportunity.stage}
        disabled={!canEdit}
        onChange={(e) => updateStage.mutate(e.target.value as OpportunityStage)}
        className="text-xs"
      >
        {OPPORTUNITY_STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </Select>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Opportunity">
        <EditOpportunityForm opportunity={opportunity} onDone={() => setEditOpen(false)} />
      </Modal>
    </Card>
  );
}

export default function OpportunitiesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("crm:write");
  const [modalOpen, setModalOpen] = useState(false);
  const opportunities = useQuery({
    queryKey: ["opportunities"],
    queryFn: () => api.get<Opportunity[]>("/crm/opportunities"),
  });

  return (
    <div>
      <PageHeader
        title="Opportunities"
        action={canEdit && <Button onClick={() => setModalOpen(true)}>New Opportunity</Button>}
      />

      {opportunities.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {opportunities.isError && (
        <QueryError error={opportunities.error} onRetry={() => opportunities.refetch()} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {OPPORTUNITY_STAGES.map((stage) => (
          <div key={stage}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {STAGE_LABELS[stage]} (
              {opportunities.data?.filter((o) => o.stage === stage).length ?? 0})
            </h2>
            <div className="space-y-2">
              {opportunities.data
                ?.filter((o) => o.stage === stage)
                .map((o) => <OpportunityCard key={o.id} opportunity={o} canEdit={canEdit} />)}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Opportunity">
        <CreateOpportunityForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
