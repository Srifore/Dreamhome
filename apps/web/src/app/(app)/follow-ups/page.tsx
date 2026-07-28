"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { InteractionType, Lead } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  ErrorMessage,
  Input,
  Label,
  Modal,
  PageHeader,
  QueryError,
  Select,
} from "@/components/ui";

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  QUOTED: "Quoted",
  WON: "Won",
  LOST: "Lost",
};

const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  CALL: "Call",
  MEETING: "Meeting",
  NOTE: "Note",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  OTHER: "Other",
};

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type DueStatus = "overdue" | "today" | "upcoming" | "unscheduled";

function dueStatus(lead: Lead): DueStatus {
  if (!lead.nextFollowUpAt) return "unscheduled";
  const due = new Date(lead.nextFollowUpAt);
  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (due < today) return "overdue";
  if (due < tomorrow) return "today";
  return "upcoming";
}

const DUE_BADGE: Record<DueStatus, { label: string; tone: "red" | "amber" | "blue" | "neutral" }> = {
  overdue: { label: "Overdue", tone: "red" },
  today: { label: "Today", tone: "amber" },
  upcoming: { label: "Upcoming", tone: "blue" },
  unscheduled: { label: "Not scheduled", tone: "neutral" },
};

function LogFollowUpForm({ lead, onDone }: { lead: Lead; onDone: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [type, setType] = useState<InteractionType>("CALL");
  const [notes, setNotes] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState(todayDateInputValue());
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      await api.post("/crm/interactions", {
        type,
        subject: `Follow-up ${INTERACTION_TYPE_LABELS[type].toLowerCase()}`,
        body: notes || undefined,
        leadId: lead.id,
      });
      await api.patch(`/crm/leads/${lead.id}`, { nextFollowUpAt: new Date(nextFollowUpAt).toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "today-followups"] });
      onDone();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to log follow-up"),
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
        <Label>Contact type</Label>
        <Select value={type} onChange={(e) => setType(e.target.value as InteractionType)}>
          {Object.entries(INTERACTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Notes</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What was discussed…"
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>
      <div>
        <Label>Next follow-up date</Label>
        <Input
          type="date"
          required
          value={nextFollowUpAt}
          onChange={(e) => setNextFollowUpAt(e.target.value)}
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Saving…" : "Save & Schedule Next Follow-up"}
      </Button>
    </form>
  );
}

export default function FollowUpsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("crm:write");
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => api.get<Lead[]>("/crm/leads") });

  const rows = useMemo(() => {
    const active = leads.data?.filter((l) => l.stage !== "WON" && l.stage !== "LOST") ?? [];
    const order: Record<DueStatus, number> = { overdue: 0, today: 1, upcoming: 2, unscheduled: 3 };
    return [...active].sort((a, b) => {
      const statusDiff = order[dueStatus(a)] - order[dueStatus(b)];
      if (statusDiff !== 0) return statusDiff;
      if (a.nextFollowUpAt && b.nextFollowUpAt) return a.nextFollowUpAt.localeCompare(b.nextFollowUpAt);
      return 0;
    });
  }, [leads.data]);

  return (
    <div>
      <PageHeader title="Follow-ups" />

      {leads.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {leads.isError && <QueryError error={leads.error} onRetry={() => leads.refetch()} />}
      {leads.data && rows.length === 0 && (
        <p className="text-sm text-slate-500">No active leads to follow up on.</p>
      )}

      <div className="space-y-2">
        {rows.map((lead) => {
          const badge = DUE_BADGE[dueStatus(lead)];
          return (
            <Card key={lead.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                <p className="text-xs text-slate-500">
                  {lead.phone} &middot; {STAGE_LABELS[lead.stage]}
                </p>
                {lead.notes && <p className="mt-0.5 text-xs text-sky-700">{lead.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  {lead.nextFollowUpAt && (
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(lead.nextFollowUpAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <Button variant="secondary" onClick={() => setActiveLead(lead)}>
                    Log Contact
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={!!activeLead} onClose={() => setActiveLead(null)} title={`Log Contact — ${activeLead?.name ?? ""}`}>
        {activeLead && <LogFollowUpForm lead={activeLead} onDone={() => setActiveLead(null)} />}
      </Modal>
    </div>
  );
}
