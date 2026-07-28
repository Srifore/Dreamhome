"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ProductUnit, ServiceTicket, ServiceTicketStatus } from "@/lib/types";
import {
  Badge,
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

const STATUSES: ServiceTicketStatus[] = ["OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const TONE: Record<ServiceTicketStatus, "neutral" | "green" | "red" | "amber" | "blue"> = {
  OPEN: "amber",
  ASSIGNED: "blue",
  IN_PROGRESS: "blue",
  RESOLVED: "green",
  CLOSED: "neutral",
};

function CreateTicketForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [serialNumber, setSerialNumber] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const unit = await api.get<ProductUnit>(`/inventory/product-units/${serialNumber.trim()}`);
      if (!unit.customerId) {
        throw new ApiError(400, "This product unit has no linked customer");
      }
      return api.post<ServiceTicket>("/crm/service-tickets", {
        productUnitId: unit.id,
        customerId: unit.customerId,
        issueDescription,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-tickets"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Failed to create ticket — check the serial number"),
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
        <Label>Product Serial Number</Label>
        <Input
          required
          placeholder="e.g. FAB-SN-000123"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
        />
      </div>
      <div>
        <Label>Issue Description</Label>
        <Input
          required
          value={issueDescription}
          onChange={(e) => setIssueDescription(e.target.value)}
        />
      </div>
      {error && <ErrorMessage message={error} />}
      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Creating…" : "Create Ticket"}
      </Button>
    </form>
  );
}

export default function ServiceTicketsPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("service:write");
  const [modalOpen, setModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const tickets = useQuery({
    queryKey: ["service-tickets"],
    queryFn: () => api.get<ServiceTicket[]>("/crm/service-tickets"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ServiceTicketStatus }) =>
      api.patch(`/crm/service-tickets/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service-tickets"] }),
  });

  return (
    <div>
      <PageHeader
        title="Service Tickets"
        action={canEdit && <Button onClick={() => setModalOpen(true)}>New Ticket</Button>}
      />

      {tickets.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {tickets.isError && <QueryError error={tickets.error} onRetry={() => tickets.refetch()} />}
      {tickets.data?.length === 0 && <EmptyState message="No service tickets yet." />}

      {!!tickets.data?.length && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Issue</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.data.map((t) => (
                <tr key={t.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2">{t.customer?.name}</td>
                  <td className="px-4 py-2">{t.productUnit?.product?.name}</td>
                  <td className="px-4 py-2">{t.issueDescription}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={TONE[t.status]}>{t.status}</Badge>
                      <Select
                        value={t.status}
                        disabled={!canEdit}
                        onChange={(e) =>
                          updateStatus.mutate({ id: t.id, status: e.target.value as ServiceTicketStatus })
                        }
                        className="w-36 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Service Ticket">
        <CreateTicketForm onDone={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}
