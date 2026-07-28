"use client";

import { use, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CompanySettings, Payment, SalesOrder } from "@/lib/types";
import { Badge, Button, Card, ErrorMessage, Input, Label, PageHeader, QueryError, Select } from "@/components/ui";
import { amountInWords } from "@/lib/number-to-words";
import { stateWithCode } from "@/lib/indian-states";

const PAYMENT_METHODS = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"];

function money(value: string | number): string {
  return Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const order = useQuery({ queryKey: ["orders", id], queryFn: () => api.get<SalesOrder>(`/sales/orders/${id}`) });
  const companySettings = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.get<CompanySettings>("/settings/company"),
  });

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [error, setError] = useState<string | null>(null);

  const recordPayment = useMutation({
    mutationFn: () =>
      api.post<Payment>("/sales/payments", {
        invoiceId: order.data!.invoice!.id,
        amount: Number(amount),
        method,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
      setAmount("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to record payment"),
  });

  if (order.isLoading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (order.isError) {
    const notFound = order.error instanceof ApiError && order.error.status === 404;
    return notFound ? (
      <p className="text-sm text-neutral-500">Order not found.</p>
    ) : (
      <QueryError error={order.error} onRetry={() => order.refetch()} />
    );
  }
  if (!order.data) return <p className="text-sm text-neutral-500">Order not found.</p>;

  const o = order.data;
  const company = companySettings.data;
  const paidTotal = o.invoice?.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  const billToParty = o.customer ?? o.b2bAccount;
  const billToAddress = o.customer?.address ?? o.b2bAccount?.address ?? null;
  const shipToAddress =
    o.shippingAddress || o.customer?.shippingAddress || o.b2bAccount?.shippingAddress || billToAddress;
  const billToGstin = o.customer?.gstin ?? o.b2bAccount?.gstin ?? null;

  const hasCgstSgst = Number(o.cgstTotal) > 0 || Number(o.sgstTotal) > 0;
  const hasIgst = Number(o.igstTotal) > 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Order ${o.orderNumber}`}
        action={
          <div className="flex items-center gap-3 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              Print / Download Invoice
            </Button>
            <Badge tone="blue">{o.status}</Badge>
          </div>
        }
      />

      {/* Printable Tax Invoice document */}
      <Card className="mb-6 print:border-0 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-6 border-b border-neutral-200 pb-6">
          <div className="flex items-start gap-4">
            {company?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logoUrl}
                alt={company.legalName ?? "Company logo"}
                className="h-16 w-16 shrink-0 rounded-lg border border-neutral-200 bg-white object-contain print:border-0"
              />
            )}
            <div>
              <p className="text-lg font-semibold text-neutral-900">{company?.legalName || "Your Company Name"}</p>
              {company?.address && <p className="text-sm text-neutral-600">{company.address}</p>}
              {(company?.city || company?.state || company?.pincode) && (
                <p className="text-sm text-neutral-600">
                  {[company?.city, company?.state, company?.pincode].filter(Boolean).join(", ")}
                </p>
              )}
              {company?.gstin && <p className="text-sm text-neutral-600">GSTIN {company.gstin}</p>}
              {company?.phone && <p className="text-sm text-neutral-600">{company.phone}</p>}
              {company?.email && <p className="text-sm text-neutral-600">{company.email}</p>}
              {company?.website && <p className="text-sm text-neutral-600">{company.website}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="mb-2 text-2xl font-bold uppercase text-neutral-900">Tax Invoice</p>
            {o.invoice && <p className="text-sm text-neutral-600"># : {o.invoice.invoiceNumber}</p>}
            <p className="text-sm text-neutral-600">Order # : {o.orderNumber}</p>
            <p className="text-sm text-neutral-600">Date : {new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
            {o.invoice && (
              <p className="text-sm text-neutral-600">
                Due Date : {new Date(o.invoice.dueDate).toLocaleDateString("en-IN")}
              </p>
            )}
            {o.placeOfSupplyState && (
              <p className="text-sm text-neutral-600">Place Of Supply : {stateWithCode(o.placeOfSupplyState)}</p>
            )}
          </div>
        </div>

        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Bill To</p>
            <p className="text-sm font-medium text-neutral-900">{billToParty?.name ?? "—"}</p>
            {billToAddress && <p className="text-sm text-neutral-600">{billToAddress}</p>}
            {billToGstin && <p className="text-sm text-neutral-600">GSTIN {billToGstin}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Ship To</p>
            <p className="text-sm font-medium text-neutral-900">{billToParty?.name ?? "—"}</p>
            {shipToAddress && <p className="text-sm text-neutral-600">{shipToAddress}</p>}
            {billToGstin && <p className="text-sm text-neutral-600">GSTIN {billToGstin}</p>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Item &amp; Description</th>
                <th className="px-2 py-2">HSN/SAC</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">Rate</th>
                {hasCgstSgst && (
                  <>
                    <th className="px-2 py-2">CGST</th>
                    <th className="px-2 py-2">SGST</th>
                  </>
                )}
                {hasIgst && <th className="px-2 py-2">IGST</th>}
                <th className="px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((item, i) => {
                const taxable = Number(item.quantity) * Number(item.unitPrice) - Number(item.discount);
                return (
                  <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-2 py-2">{i + 1}</td>
                    <td className="px-2 py-2">{item.product?.name}</td>
                    <td className="px-2 py-2 text-xs text-neutral-500">{item.hsnCode ?? "—"}</td>
                    <td className="px-2 py-2">{item.quantity}</td>
                    <td className="px-2 py-2">₹{money(item.unitPrice)}</td>
                    {hasCgstSgst && (
                      <>
                        <td className="px-2 py-2 text-xs text-neutral-500">
                          {item.gstRate ? `${Number(item.gstRate) / 2}%` : "—"} ₹{money(item.cgstAmount)}
                        </td>
                        <td className="px-2 py-2 text-xs text-neutral-500">
                          {item.gstRate ? `${Number(item.gstRate) / 2}%` : "—"} ₹{money(item.sgstAmount)}
                        </td>
                      </>
                    )}
                    {hasIgst && (
                      <td className="px-2 py-2 text-xs text-neutral-500">
                        {item.gstRate ? `${Number(item.gstRate)}%` : "—"} ₹{money(item.igstAmount)}
                      </td>
                    )}
                    <td className="px-2 py-2 text-right">₹{money(taxable)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>Sub Total</span>
              <span>₹{money(o.subtotal)}</span>
            </div>
            {Number(o.discount) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Discount</span>
                <span>− ₹{money(o.discount)}</span>
              </div>
            )}
            {Number(o.cgstTotal) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>CGST</span>
                <span>₹{money(o.cgstTotal)}</span>
              </div>
            )}
            {Number(o.sgstTotal) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>SGST</span>
                <span>₹{money(o.sgstTotal)}</span>
              </div>
            )}
            {Number(o.igstTotal) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>IGST</span>
                <span>₹{money(o.igstTotal)}</span>
              </div>
            )}
            {Number(o.roundingAdjustment) !== 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Rounding</span>
                <span>₹{money(o.roundingAdjustment)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-1.5 text-base font-semibold text-neutral-900">
              <span>Total</span>
              <span>₹{money(o.total)}</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-right text-xs italic text-neutral-500">{amountInWords(Number(o.total))}</p>

        <div className="mt-8 grid gap-6 border-t border-neutral-200 pt-6 sm:grid-cols-2">
          <div className="space-y-4">
            {o.notes && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Notes</p>
                <p className="whitespace-pre-wrap text-sm text-neutral-600">{o.notes}</p>
              </div>
            )}
            {(company?.bankAccountNumber || company?.bankName) && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Bank Details</p>
                <div className="text-sm text-neutral-600">
                  {company?.bankAccountName && <p>Account Name: {company.bankAccountName}</p>}
                  {company?.bankAccountNumber && <p>Account No: {company.bankAccountNumber}</p>}
                  {company?.bankIfsc && <p>IFSC: {company.bankIfsc}</p>}
                  {company?.bankName && (
                    <p>
                      {company.bankName}
                      {company.bankBranch ? `, ${company.bankBranch}` : ""}
                    </p>
                  )}
                </div>
              </div>
            )}
            {o.termsAndConditions && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Terms &amp; Conditions
                </p>
                <p className="whitespace-pre-wrap text-sm text-neutral-600">{o.termsAndConditions}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end justify-end text-right">
            <div className="mb-12 h-16" />
            <div className="w-48 border-t border-neutral-300 pt-1 text-sm text-neutral-600">
              Authorized Signature
            </div>
          </div>
        </div>
      </Card>

      <div className="print:hidden">
        {o.productUnits && o.productUnits.length > 0 && (
          <Card className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-neutral-900">Serialized Units</h2>
            <ul className="space-y-1 text-sm">
              {o.productUnits.map((u) => (
                <li key={u.id} className="font-mono text-xs">
                  {u.serialNumber}{" "}
                  <span className="font-sans text-neutral-500">
                    · warranty until{" "}
                    {u.warrantyExpiresAt ? new Date(u.warrantyExpiresAt).toLocaleDateString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {o.invoice && (
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Invoice {o.invoice.invoiceNumber}</h2>
              <Badge tone={o.invoice.status === "PAID" ? "green" : o.invoice.status === "OVERDUE" ? "red" : "amber"}>
                {o.invoice.status}
              </Badge>
            </div>
            <p className="mb-3 text-sm text-neutral-600">
              Paid ₹{paidTotal.toLocaleString("en-IN")} of ₹{Number(o.invoice.amount).toLocaleString("en-IN")}
            </p>

            {o.invoice.payments && o.invoice.payments.length > 0 && (
              <ul className="mb-3 space-y-1 text-xs text-neutral-500">
                {o.invoice.payments.map((p) => (
                  <li key={p.id}>
                    ₹{Number(p.amount).toLocaleString("en-IN")} via {p.method} on{" "}
                    {new Date(p.paidAt).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            )}

            {o.invoice.status !== "PAID" && hasPermission("sales:write") && (
              <form
                onSubmit={(e: FormEvent) => {
                  e.preventDefault();
                  setError(null);
                  recordPayment.mutate();
                }}
                className="flex flex-wrap items-end gap-2"
              >
                <div className="w-32">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="w-36">
                  <Label>Method</Label>
                  <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit" disabled={recordPayment.isPending}>
                  {recordPayment.isPending ? "Recording…" : "Record Payment"}
                </Button>
                {error && <ErrorMessage message={error} />}
              </form>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
