"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LEAD_STAGES, type Lead, type LeadStage } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, Label, Modal, PageHeader, QueryError, Select } from "@/components/ui";

const STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  QUOTED: "Quoted",
  WON: "Won",
  LOST: "Lost",
};

function CreateLeadForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", email: "", source: "" });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<Lead>("/crm/leads", {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        source: form.source || undefined,
        assignedToId: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to create lead"),
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
        <Label>Source</Label>
        <Input
          placeholder="Showroom walk-in, referral, website…"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Creating…" : "Create Lead"}
      </Button>
    </form>
  );
}

function LeadCard({ lead, canEdit }: { lead: Lead; canEdit: boolean }) {
  const queryClient = useQueryClient();

  const updateStage = useMutation({
    mutationFn: (stage: LeadStage) => api.patch(`/crm/leads/${lead.id}`, { stage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
  });

  const convert = useMutation({
    mutationFn: () => api.post(`/crm/leads/${lead.id}/convert-to-customer`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  return (
    <Card className="space-y-2">
      <p className="text-sm font-medium text-neutral-900">{lead.name}</p>
      <p className="text-xs text-neutral-500">{lead.phone}</p>
      {lead.source && <p className="text-xs text-neutral-400">{lead.source}</p>}
      {lead.notes && <p className="text-xs text-sky-700">{lead.notes}</p>}
      <Select
        value={lead.stage}
        disabled={!canEdit}
        onChange={(e) => updateStage.mutate(e.target.value as LeadStage)}
        className="text-xs"
      >
        {LEAD_STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </Select>
      {canEdit && !lead.customerId && lead.stage === "WON" && (
        <Button
          variant="secondary"
          className="w-full text-xs"
          disabled={convert.isPending}
          onClick={() => convert.mutate()}
        >
          {convert.isPending ? "Converting…" : "Convert to Customer"}
        </Button>
      )}
      {lead.customerId && <p className="text-xs text-green-600">Converted to customer</p>}
    </Card>
  );
}

export default function LeadsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("crm:write");
  const [modalOpen, setModalOpen] = useState(false);
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => api.get<Lead[]>("/crm/leads") });

  return (
    <div>
      <PageHeader
        title="Leads"
        action={canEdit && <Button onClick={() => setModalOpen(true)}>New Lead</Button>}
      />

      {leads.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {leads.isError && <QueryError error={leads.error} onRetry={() => leads.refetch()} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {LEAD_STAGES.map((stage) => (
          <div key={stage}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {STAGE_LABELS[stage]} ({leads.data?.filter((l) => l.stage === stage).length ?? 0})
            </h2>
            <div className="space-y-2">
              {leads.data
                ?.filter((l) => l.stage === stage)
                .map((lead) => <LeadCard key={lead.id} lead={lead} canEdit={canEdit} />)}
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Lead">
        <CreateLeadForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
