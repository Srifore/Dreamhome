"use client";

import { use, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Branch, CompanySettings, Quote, QuoteStatus, SalesOrder } from "@/lib/types";
import { Badge, Button, Card, ErrorMessage, Input, Label, PageHeader, QueryError, Select } from "@/components/ui";
import { amountInWords } from "@/lib/number-to-words";
import { stateWithCode } from "@/lib/indian-states";
import { getQuoteTemplateStyle } from "@/lib/quote-templates";

function money(value: string | number): string {
  return Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasPermission } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const quote = useQuery({ queryKey: ["quotes", id], queryFn: () => api.get<Quote>(`/sales/quotes/${id}`) });
  const branches = useQuery({ queryKey: ["branches"], queryFn: () => api.get<Branch[]>("/branches") });
  const companySettings = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.get<CompanySettings>("/settings/company"),
  });

  const [branchId, setBranchId] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("12");
  const [serials, setSerials] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const confirmOrder = useMutation({
    mutationFn: () =>
      api.post<SalesOrder>("/sales/orders", {
        quoteId: id,
        branchId,
        warrantyMonths: Number(warrantyMonths),
        itemSerials:
          quote.data?.items.map((item) => ({
            productId: item.productId,
            serialNumbers: (serials[item.id] ?? "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })) ?? [],
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push(`/orders/${order.id}`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to confirm order"),
  });

  const updateStatus = useMutation({
    mutationFn: (status: QuoteStatus) => api.patch(`/sales/quotes/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quotes", id] }),
  });

  if (quote.isLoading) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (quote.isError) {
    const notFound = quote.error instanceof ApiError && quote.error.status === 404;
    return notFound ? (
      <p className="text-sm text-neutral-500">Quote not found.</p>
    ) : (
      <QueryError error={quote.error} onRetry={() => quote.refetch()} />
    );
  }
  if (!quote.data) return <p className="text-sm text-neutral-500">Quote not found.</p>;

  const q = quote.data;
  const company = companySettings.data;
  const alreadyConverted = q.status === "ACCEPTED";
  const canConfirm = (q.status === "DRAFT" || q.status === "SENT") && hasPermission("sales:write");
  const canEditStatus = (q.status === "DRAFT" || q.status === "SENT") && hasPermission("sales:write");
  const badgeTone =
    q.status === "ACCEPTED" ? "green" : q.status === "REJECTED" || q.status === "EXPIRED" ? "red" : "neutral";

  const billToParty = q.customer ?? q.b2bAccount;
  const billToAddress = q.customer?.address ?? q.b2bAccount?.address ?? null;
  const shipToAddress =
    q.shippingAddress || q.customer?.shippingAddress || q.b2bAccount?.shippingAddress || billToAddress;
  const billToGstin = q.customer?.gstin ?? q.b2bAccount?.gstin ?? null;

  const hasCgstSgst = Number(q.cgstTotal) > 0 || Number(q.sgstTotal) > 0;
  const hasIgst = Number(q.igstTotal) > 0;

  const style = getQuoteTemplateStyle(q.templateId);
  const centered = style.headerAlign === "center";

  const companyInfoBlock = (
    <div className={centered ? "flex flex-col items-center gap-1" : "flex items-start gap-4"}>
      {company?.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={company.logoUrl}
          alt={company.legalName ?? "Company logo"}
          className="h-16 w-16 shrink-0 rounded-lg border border-neutral-200 bg-white object-contain print:border-0"
        />
      )}
      <div className={centered ? "text-center" : ""}>
        <p className={style.companyNameClass}>{company?.legalName || "Your Company Name"}</p>
        {company?.address && <p className={style.addressClass}>{company.address}</p>}
        {(company?.city || company?.state || company?.pincode) && (
          <p className={style.addressClass}>
            {[company?.city, company?.state, company?.pincode].filter(Boolean).join(", ")}
          </p>
        )}
        {company?.gstin && <p className={style.addressClass}>GSTIN {company.gstin}</p>}
        {company?.phone && <p className={style.addressClass}>{company.phone}</p>}
        {company?.email && <p className={style.addressClass}>{company.email}</p>}
        {company?.website && <p className={style.addressClass}>{company.website}</p>}
      </div>
    </div>
  );

  const metaBlock = (
    <div className={centered ? "" : "text-right"}>
      <p className={style.titleClass}>Quote</p>
      <p className={style.metaClass}># : {q.quoteNumber}</p>
      <p className={style.metaClass}>Quote Date : {new Date(q.quoteDate).toLocaleDateString("en-IN")}</p>
      {q.validUntil && (
        <p className={style.metaClass}>Valid Until : {new Date(q.validUntil).toLocaleDateString("en-IN")}</p>
      )}
      {q.placeOfSupplyState && (
        <p className={style.metaClass}>Place Of Supply : {stateWithCode(q.placeOfSupplyState)}</p>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`Quote ${q.quoteNumber}`}
        action={
          <div className="flex items-center gap-3 print:hidden">
            {canEditStatus && (
              <Link href={`/quotes/${id}/edit`}>
                <Button variant="secondary">Edit</Button>
              </Link>
            )}
            <Button variant="secondary" onClick={() => window.print()}>
              Print / Download PDF
            </Button>
            <Badge tone={badgeTone}>{q.status}</Badge>
          </div>
        }
      />

      {canEditStatus && (
        <Card className="mb-6 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">
              {q.status === "DRAFT"
                ? "Mark this quote as sent once it's been shared with the customer, or reject it if it's no longer going ahead."
                : "Update this quote's status if the customer has responded or it's no longer valid."}
            </p>
            <div className="flex gap-2">
              {q.status === "DRAFT" && (
                <Button
                  variant="secondary"
                  disabled={updateStatus.isPending}
                  onClick={() => updateStatus.mutate("SENT")}
                >
                  Mark as Sent
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate("REJECTED")}
              >
                Mark Rejected
              </Button>
              <Button
                variant="secondary"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate("EXPIRED")}
              >
                Mark Expired
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Printable quote document */}
      <Card className={`mb-6 ${style.cardClass}`}>
        <div className={style.headerWrapClass}>
          {companyInfoBlock}
          {metaBlock}
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
            <thead className={style.tableHeadRowClass}>
              <tr>
                <th className={style.tableHeadCellClass}>#</th>
                <th className={style.tableHeadCellClass}>Item &amp; Description</th>
                <th className={style.tableHeadCellClass}>HSN/SAC</th>
                <th className={style.tableHeadCellClass}>Qty</th>
                <th className={style.tableHeadCellClass}>Rate</th>
                {hasCgstSgst && (
                  <>
                    <th className={style.tableHeadCellClass}>CGST</th>
                    <th className={style.tableHeadCellClass}>SGST</th>
                  </>
                )}
                {hasIgst && <th className={style.tableHeadCellClass}>IGST</th>}
                <th className={`${style.tableHeadCellClass} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {q.items.map((item, i) => {
                const taxable = Number(item.quantity) * Number(item.unitPrice) - Number(item.discount);
                return (
                  <tr key={item.id} className={style.tableBorderClass}>
                    <td className={style.tableCellClass}>{i + 1}</td>
                    <td className={style.tableCellClass}>{item.product?.name}</td>
                    <td className={`${style.tableCellClass} text-xs text-neutral-500`}>{item.hsnCode ?? "—"}</td>
                    <td className={style.tableCellClass}>{item.quantity}</td>
                    <td className={style.tableCellClass}>₹{money(item.unitPrice)}</td>
                    {hasCgstSgst && (
                      <>
                        <td className={`${style.tableCellClass} text-xs text-neutral-500`}>
                          {item.gstRate ? `${Number(item.gstRate) / 2}%` : "—"} ₹{money(item.cgstAmount)}
                        </td>
                        <td className={`${style.tableCellClass} text-xs text-neutral-500`}>
                          {item.gstRate ? `${Number(item.gstRate) / 2}%` : "—"} ₹{money(item.sgstAmount)}
                        </td>
                      </>
                    )}
                    {hasIgst && (
                      <td className={`${style.tableCellClass} text-xs text-neutral-500`}>
                        {item.gstRate ? `${Number(item.gstRate)}%` : "—"} ₹{money(item.igstAmount)}
                      </td>
                    )}
                    <td className={`${style.tableCellClass} text-right`}>₹{money(taxable)}</td>
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
              <span>₹{money(q.subtotal)}</span>
            </div>
            {Number(q.discount) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Discount</span>
                <span>− ₹{money(q.discount)}</span>
              </div>
            )}
            {Number(q.cgstTotal) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>CGST</span>
                <span>₹{money(q.cgstTotal)}</span>
              </div>
            )}
            {Number(q.sgstTotal) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>SGST</span>
                <span>₹{money(q.sgstTotal)}</span>
              </div>
            )}
            {Number(q.igstTotal) > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>IGST</span>
                <span>₹{money(q.igstTotal)}</span>
              </div>
            )}
            {Number(q.roundingAdjustment) !== 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Rounding</span>
                <span>₹{money(q.roundingAdjustment)}</span>
              </div>
            )}
            <div className={`flex justify-between ${style.totalRowClass}`}>
              <span>Total</span>
              <span>₹{money(q.total)}</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-right text-xs italic text-neutral-500">{amountInWords(Number(q.total))}</p>

        <div className="mt-8 grid gap-6 border-t border-neutral-200 pt-6 sm:grid-cols-2">
          <div className="space-y-4">
            {q.notes && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Notes</p>
                <p className="whitespace-pre-wrap text-sm text-neutral-600">{q.notes}</p>
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
            {q.termsAndConditions && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Terms &amp; Conditions
                </p>
                <p className="whitespace-pre-wrap text-sm text-neutral-600">{q.termsAndConditions}</p>
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
        {!alreadyConverted && (q.status === "REJECTED" || q.status === "EXPIRED") && (
          <Card>
            <p className="text-sm text-neutral-500">
              This quote is {q.status.toLowerCase()} and can no longer be confirmed as a sales order.
            </p>
          </Card>
        )}

        {!alreadyConverted && q.status !== "REJECTED" && q.status !== "EXPIRED" && !hasPermission("sales:write") && (
          <Card>
            <p className="text-sm text-neutral-500">
              You don&apos;t have permission to confirm sales orders. Ask an admin for the &quot;Manage Sales&quot;
              permission.
            </p>
          </Card>
        )}

        {canConfirm && (
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">Confirm as Sales Order</h2>
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                setError(null);
                confirmOrder.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <Label>Branch</Label>
                <Select required value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  <option value="">Select branch</option>
                  {branches.data?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Warranty (months)</Label>
                <Input
                  type="number"
                  min="1"
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(e.target.value)}
                />
              </div>
              {q.items.map((item) => (
                <div key={item.id}>
                  <Label>
                    Serial number(s) for {item.product?.name} — comma-separated, {item.quantity} required
                  </Label>
                  <Input
                    required
                    placeholder="e.g. SN-0001, SN-0002"
                    value={serials[item.id] ?? ""}
                    onChange={(e) => setSerials({ ...serials, [item.id]: e.target.value })}
                  />
                </div>
              ))}
              {error && <ErrorMessage message={error} />}
              <Button type="submit" disabled={confirmOrder.isPending} className="w-full">
                {confirmOrder.isPending ? "Confirming…" : "Confirm Sales Order"}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
