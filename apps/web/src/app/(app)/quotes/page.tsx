"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CompanySettings, Quote } from "@/lib/types";
import { Badge, Button, Card, EmptyState, ErrorMessage, Input, Modal, PageHeader, QueryError } from "@/components/ui";

const STATUS_TONE: Record<string, "neutral" | "green" | "red" | "amber" | "blue"> = {
  DRAFT: "neutral",
  SENT: "blue",
  ACCEPTED: "green",
  REJECTED: "red",
  EXPIRED: "neutral",
};

const EDITABLE_STATUSES = ["DRAFT", "SENT"];

function ViewIconButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="View quote"
      title="View quote"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        />
        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function EditIconButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Edit quote"
      title="Edit quote"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        />
      </svg>
    </Link>
  );
}

function SendIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Send quote"
      title="Send quote"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
      </svg>
    </button>
  );
}

function DeleteIconButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Delete quote"
      title="Delete quote"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 7h12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.7 12.1a2 2 0 0 1-2 1.9H8.7a2 2 0 0 1-2-1.9L6 7h12Z"
        />
      </svg>
    </button>
  );
}

function buildEmailBody(quote: Quote, company?: CompanySettings): string {
  const party = quote.customer?.name ?? quote.b2bAccount?.name ?? "there";
  const companyName = company?.legalName || "us";
  const lines = quote.items.map(
    (item) => `- ${item.quantity} x ${item.product?.name ?? "Item"}: ₹${Number(item.unitPrice) * item.quantity}`,
  );
  const validUntil = quote.validUntil
    ? `\nValid until: ${new Date(quote.validUntil).toLocaleDateString("en-IN")}`
    : "";
  const contact = company?.phone || company?.email ? `\n\nFor any questions, reach us at ${company.phone || company.email}.` : "";
  return (
    `Hi ${party},\n\nThank you for your interest in ${companyName}. Here is your quote ${quote.quoteNumber}:\n\n` +
    `${lines.join("\n")}\n\nTotal: ₹${Number(quote.total).toLocaleString("en-IN")}${validUntil}${contact}\n\nThank you,\n${companyName}`
  );
}

function SendQuoteModal({ quoteId, onClose }: { quoteId: string; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [sentVia, setSentVia] = useState<string | null>(null);

  const quote = useQuery({
    queryKey: ["quotes", quoteId],
    queryFn: () => api.get<Quote>(`/sales/quotes/${quoteId}`),
  });
  const companySettings = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.get<CompanySettings>("/settings/company"),
  });

  const sendWhatsApp = useMutation({
    mutationFn: () => api.post(`/sales/quotes/${quoteId}/send-whatsapp`),
    onSuccess: () => {
      setError(null);
      setSentVia("WhatsApp");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to send via WhatsApp"),
  });

  const q = quote.data;
  const party = q?.customer ?? q?.b2bAccount;
  const whatsappPhone = q?.customer?.phone ?? q?.b2bAccount?.contacts?.find((c) => c.phone)?.phone ?? null;
  const email = q?.customer?.email ?? q?.b2bAccount?.contacts?.find((c) => c.email)?.email ?? null;

  function handleSendEmail() {
    if (!q || !email) return;
    const subject = `Quote ${q.quoteNumber} from ${companySettings.data?.legalName || "DreamHome"}`;
    const body = buildEmailBody(q, companySettings.data);
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSentVia("Email");
  }

  return (
    <Modal open onClose={onClose} title={q ? `Send Quote ${q.quoteNumber}` : "Send Quote"}>
      {quote.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {q && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Send this quote to <span className="font-medium text-neutral-900">{party?.name ?? "the customer"}</span>
            .
          </p>

          <div className="space-y-2">
            <Button className="w-full" onClick={() => sendWhatsApp.mutate()} disabled={!whatsappPhone || sendWhatsApp.isPending}>
              {sendWhatsApp.isPending ? "Sending…" : "Send via WhatsApp"}
            </Button>
            {!whatsappPhone && <p className="text-xs text-neutral-400">No phone number on file.</p>}

            <Button variant="secondary" className="w-full" onClick={handleSendEmail} disabled={!email}>
              Send via Email
            </Button>
            {!email && <p className="text-xs text-neutral-400">No email address on file.</p>}
          </div>

          {sentVia === "WhatsApp" && <p className="text-sm text-green-600">Sent via WhatsApp.</p>}
          {sentVia === "Email" && (
            <p className="text-sm text-green-600">Your email app should now be open with the quote pre-filled.</p>
          )}
          {error && <ErrorMessage message={error} />}
        </div>
      )}
    </Modal>
  );
}

export default function QuotesPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("sales:write");
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sendQuoteId, setSendQuoteId] = useState<string | null>(null);
  const quotes = useQuery({ queryKey: ["quotes"], queryFn: () => api.get<Quote[]>("/sales/quotes") });

  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quotes.data ?? [];
    return (quotes.data ?? []).filter(
      (q) =>
        q.quoteNumber.toLowerCase().includes(term) ||
        (q.customer?.name ?? q.b2bAccount?.name ?? "").toLowerCase().includes(term),
    );
  }, [quotes.data, search]);

  const deleteQuote = useMutation({
    mutationFn: (id: string) => api.delete(`/sales/quotes/${id}`),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : "Failed to delete quote"),
  });

  function handleDelete(q: Quote) {
    if (!confirm(`Delete quote ${q.quoteNumber}? This cannot be undone.`)) return;
    deleteQuote.mutate(q.id);
  }

  return (
    <div>
      <PageHeader
        title="Quotes"
        action={
          hasPermission("sales:write") && (
            <Link href="/quotes/new">
              <Button>New Quote</Button>
            </Link>
          )
        }
      />

      <div className="mb-4 max-w-xs">
        <Input
          placeholder="Search by quote # or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {quotes.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {quotes.isError && <QueryError error={quotes.error} onRetry={() => quotes.refetch()} />}
      {quotes.data?.length === 0 && <EmptyState message="No quotes yet." />}
      {!!quotes.data?.length && filteredQuotes.length === 0 && (
        <EmptyState message="No quotes match your search." />
      )}
      {actionError && <ErrorMessage message={actionError} />}

      {filteredQuotes.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Quote #</th>
                <th className="px-4 py-2">Customer / Account</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((q) => (
                <tr key={q.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/quotes/${q.id}`} className="font-medium text-neutral-900 hover:underline">
                      {q.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{q.customer?.name ?? q.b2bAccount?.name ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge tone={STATUS_TONE[q.status] ?? "neutral"}>{q.status}</Badge>
                  </td>
                  <td className="px-4 py-2">₹{Number(q.total).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <ViewIconButton href={`/quotes/${q.id}`} />
                      {canEdit && EDITABLE_STATUSES.includes(q.status) && (
                        <EditIconButton href={`/quotes/${q.id}/edit`} />
                      )}
                      {canEdit && <SendIconButton onClick={() => setSendQuoteId(q.id)} />}
                      {canEdit && !q.salesOrder && (
                        <DeleteIconButton onClick={() => handleDelete(q)} disabled={deleteQuote.isPending} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {sendQuoteId && <SendQuoteModal quoteId={sendQuoteId} onClose={() => setSendQuoteId(null)} />}
    </div>
  );
}
