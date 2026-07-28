"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { B2BAccount, CompanySettings, Customer, Product, Quote } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, Modal, PageHeader, Select, SegmentedControl } from "@/components/ui";
import { INDIAN_STATES } from "@/lib/indian-states";
import { amountInWords } from "@/lib/number-to-words";
import { QUOTE_TEMPLATES } from "@/lib/quote-templates";

function TemplatePreview({ templateId }: { templateId: string }) {
  if (templateId === "modern") {
    return (
      <div className="overflow-hidden rounded border border-slate-200">
        <div className="h-4 bg-sky-600" />
        <div className="space-y-1 p-2">
          <div className="h-1 w-1/2 rounded bg-sky-100" />
          <div className="h-1 w-full rounded bg-neutral-100" />
          <div className="h-1 w-full rounded bg-neutral-100" />
        </div>
      </div>
    );
  }
  if (templateId === "simple") {
    return (
      <div className="space-y-1.5 rounded border border-slate-100 p-2">
        <div className="h-1.5 w-2/5 rounded bg-neutral-300" />
        <div className="mt-2 h-px w-full bg-neutral-200" />
        <div className="h-1 w-full bg-transparent" />
        <div className="h-1 w-full bg-transparent" />
      </div>
    );
  }
  if (templateId === "classic") {
    return (
      <div className="space-y-1.5 rounded border-2 border-double border-neutral-300 p-2">
        <div className="mx-auto h-1.5 w-1/2 rounded bg-neutral-400" />
        <div className="mt-1 grid grid-cols-3 gap-px bg-neutral-300">
          <div className="h-2 bg-neutral-100" />
          <div className="h-2 bg-neutral-100" />
          <div className="h-2 bg-neutral-100" />
        </div>
      </div>
    );
  }
  if (templateId === "compact") {
    return (
      <div className="space-y-1 rounded border border-slate-200 p-2">
        <div className="h-1 w-1/3 rounded bg-neutral-300" />
        <div className="mt-1 grid grid-cols-4 gap-px bg-neutral-200">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-1.5 bg-neutral-50" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1.5 rounded border border-slate-200 p-2">
      <div className="flex justify-between">
        <div className="h-1.5 w-1/3 rounded bg-neutral-300" />
        <div className="h-1.5 w-1/5 rounded bg-neutral-300" />
      </div>
      <div className="mt-2 h-1 w-full rounded bg-neutral-100" />
      <div className="h-1 w-full rounded bg-neutral-100" />
    </div>
  );
}

interface ItemRow {
  productId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  hsnCode: string;
  gstRate: string;
}

const EMPTY_ROW: ItemRow = { productId: "", quantity: "1", unitPrice: "", discount: "0", hsnCode: "", gstRate: "" };

function num(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function QuoteForm({ existingQuote }: { existingQuote?: Quote }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.get<Customer[]>("/crm/customers") });
  const b2bAccounts = useQuery({
    queryKey: ["b2b-accounts"],
    queryFn: () => api.get<B2BAccount[]>("/crm/b2b-accounts"),
  });
  const products = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/inventory/products") });
  const companySettings = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.get<CompanySettings>("/settings/company"),
  });

  const [billTo, setBillTo] = useState<"customer" | "b2b">(existingQuote?.b2bAccountId ? "b2b" : "customer");
  const [customerId, setCustomerId] = useState(existingQuote?.customerId ?? "");
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");
  const [newCustomerGstin, setNewCustomerGstin] = useState("");
  const [newCustomerState, setNewCustomerState] = useState("");
  const [customerGstin, setCustomerGstin] = useState(existingQuote?.customer?.gstin ?? "");
  const [b2bAccountId, setB2bAccountId] = useState(existingQuote?.b2bAccountId ?? "");
  const [b2bAccountGstin, setB2bAccountGstin] = useState(existingQuote?.b2bAccount?.gstin ?? "");
  const [quoteDate, setQuoteDate] = useState(toDateInputValue(existingQuote?.quoteDate) || todayDateInputValue());
  const [validUntil, setValidUntil] = useState(toDateInputValue(existingQuote?.validUntil));
  const [placeOfSupplyState, setPlaceOfSupplyState] = useState(existingQuote?.placeOfSupplyState ?? "");
  const [shippingAddress, setShippingAddress] = useState(existingQuote?.shippingAddress ?? "");
  const [notes, setNotes] = useState(existingQuote?.notes ?? companySettings.data?.defaultNotes ?? "");
  const [termsAndConditions, setTermsAndConditions] = useState(
    existingQuote?.termsAndConditions ?? companySettings.data?.defaultTermsAndConditions ?? "",
  );
  const [notesTouched, setNotesTouched] = useState(!!existingQuote);
  const [termsTouched, setTermsTouched] = useState(!!existingQuote);
  const [templateId, setTemplateId] = useState(existingQuote?.templateId ?? "standard");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Defaults Notes/Terms from the business-wide Settings once they arrive — only on create, and
  // only if the user hasn't already typed something (company settings loads async, after the
  // form's initial render).
  if (!existingQuote && !notesTouched && companySettings.data?.defaultNotes && !notes) {
    setNotes(companySettings.data.defaultNotes);
  }
  if (!existingQuote && !termsTouched && companySettings.data?.defaultTermsAndConditions && !termsAndConditions) {
    setTermsAndConditions(companySettings.data.defaultTermsAndConditions);
  }

  const [items, setItems] = useState<ItemRow[]>(
    existingQuote?.items.length
      ? existingQuote.items.map((item) => ({
          productId: item.productId,
          quantity: String(item.quantity),
          unitPrice: item.unitPrice,
          discount: item.discount,
          hsnCode: item.hsnCode ?? "",
          gstRate: item.gstRate ?? "",
        }))
      : [{ ...EMPTY_ROW }],
  );
  const [error, setError] = useState<string | null>(null);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleProductChange(index: number, productId: string) {
    const product = products.data?.find((p) => p.id === productId);
    updateItem(index, {
      productId,
      unitPrice: product?.price ?? "",
      hsnCode: product?.hsnCode ?? "",
      gstRate: product?.gstRate ?? "",
    });
  }

  function handleCustomerChange(id: string) {
    if (id === "__new__") {
      setNewCustomerMode(true);
      setCustomerId("");
      return;
    }
    setCustomerId(id);
    const c = customers.data?.find((x) => x.id === id);
    if (c?.state) setPlaceOfSupplyState(c.state);
    setShippingAddress(c?.shippingAddress || c?.address || "");
    setCustomerGstin(c?.gstin ?? "");
  }

  function handleB2bChange(id: string) {
    setB2bAccountId(id);
    const a = b2bAccounts.data?.find((x) => x.id === id);
    if (a?.state) setPlaceOfSupplyState(a.state);
    setShippingAddress(a?.shippingAddress || a?.address || "");
    setB2bAccountGstin(a?.gstin ?? "");
  }

  // Same rule as the backend (QuotesService.computeQuoteTotals): either state unknown defaults
  // to intra-state, so the live preview here always matches what actually gets saved.
  const companyState = companySettings.data?.state ?? null;
  const isIntraState =
    !placeOfSupplyState ||
    !companyState ||
    placeOfSupplyState.trim().toLowerCase() === companyState.trim().toLowerCase();

  const lineCalcs = useMemo(
    () =>
      items.map((row) => {
        const lineAmount = num(row.quantity) * num(row.unitPrice);
        const taxable = lineAmount - num(row.discount);
        const rate = num(row.gstRate);
        const cgst = isIntraState ? (taxable * rate) / 2 / 100 : 0;
        const sgst = isIntraState ? (taxable * rate) / 2 / 100 : 0;
        const igst = isIntraState ? 0 : (taxable * rate) / 100;
        return { lineAmount, taxable, cgst, sgst, igst };
      }),
    [items, isIntraState],
  );

  const subtotal = lineCalcs.reduce((sum, l) => sum + l.lineAmount, 0);
  const discountTotal = items.reduce((sum, row) => sum + num(row.discount), 0);
  const cgstTotal = lineCalcs.reduce((sum, l) => sum + l.cgst, 0);
  const sgstTotal = lineCalcs.reduce((sum, l) => sum + l.sgst, 0);
  const igstTotal = lineCalcs.reduce((sum, l) => sum + l.igst, 0);
  const rawTotal = subtotal - discountTotal + cgstTotal + sgstTotal + igstTotal;
  const total = Math.round(rawTotal);
  const roundingAdjustment = total - rawTotal;

  const payload = {
    customerId: billTo === "customer" && !newCustomerMode ? customerId : undefined,
    newCustomer:
      billTo === "customer" && newCustomerMode
        ? {
            name: newCustomerName,
            phone: newCustomerPhone,
            email: newCustomerEmail || undefined,
            address: newCustomerAddress || undefined,
            gstin: newCustomerGstin || undefined,
            state: newCustomerState || undefined,
          }
        : undefined,
    customerGstin: billTo === "customer" && !newCustomerMode && customerId ? customerGstin : undefined,
    b2bAccountId: billTo === "b2b" ? b2bAccountId : undefined,
    b2bAccountGstin: billTo === "b2b" && b2bAccountId ? b2bAccountGstin : undefined,
    quoteDate: quoteDate ? new Date(quoteDate).toISOString() : undefined,
    validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
    placeOfSupplyState: placeOfSupplyState || undefined,
    shippingAddress: shippingAddress || undefined,
    notes: notes || undefined,
    termsAndConditions: termsAndConditions || undefined,
    templateId,
    items: items.map((row) => ({
      productId: row.productId,
      quantity: num(row.quantity),
      unitPrice: num(row.unitPrice),
      discount: num(row.discount),
    })),
  };

  const mutation = useMutation({
    mutationFn: () =>
      existingQuote
        ? api.patch<Quote>(`/sales/quotes/${existingQuote.id}`, payload)
        : api.post<Quote>("/sales/quotes", payload),
    onSuccess: (quote) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      if (newCustomerMode) queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (existingQuote) queryClient.invalidateQueries({ queryKey: ["quotes", existingQuote.id] });
      router.push(`/quotes/${quote.id}`);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : `Failed to ${existingQuote ? "update" : "create"} quote`),
  });

  const canSubmit =
    (billTo === "customer"
      ? newCustomerMode
        ? !!newCustomerName.trim() && !!newCustomerPhone.trim()
        : !!customerId
      : !!b2bAccountId) && items.every((row) => row.productId && num(row.quantity) > 0 && row.unitPrice !== "");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={existingQuote ? `Edit Quote ${existingQuote.quoteNumber}` : "New Quote"}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTemplatePickerOpen(true)}
              aria-label="Choose template"
              title="Choose template"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <Button
              variant="secondary"
              onClick={() => router.push(existingQuote ? `/quotes/${existingQuote.id}` : "/quotes")}
            >
              Cancel
            </Button>
          </div>
        }
      />

      {templatePickerOpen && (
        <Modal open onClose={() => setTemplatePickerOpen(false)} title="Choose a Quote Template">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {QUOTE_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplateId(t.id);
                  setTemplatePickerOpen(false);
                }}
                className={`rounded-lg border-2 p-2 text-left transition-colors ${
                  templateId === t.id ? "border-sky-500 bg-sky-50" : "border-transparent hover:bg-neutral-50"
                }`}
              >
                <TemplatePreview templateId={t.id} />
                <p className="mt-2 text-xs font-semibold text-neutral-900">{t.name}</p>
                <p className="text-[11px] text-neutral-500">{t.description}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
        className="space-y-6"
      >
        <Card>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-4 text-sm font-semibold text-neutral-900">Bill To</h2>
              <div className="mb-3">
                <SegmentedControl
                  value={billTo}
                  onChange={setBillTo}
                  options={[
                    { value: "customer", label: "Customer" },
                    { value: "b2b", label: "B2B Account" },
                  ]}
                />
              </div>
              {billTo === "customer" ? (
                newCustomerMode ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                    <Input
                      required
                      placeholder="Name"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                    />
                    <Input
                      required
                      placeholder="Phone"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                    />
                    <Input
                      type="email"
                      placeholder="Email (optional)"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                    />
                    <Input
                      placeholder="Address (optional)"
                      value={newCustomerAddress}
                      onChange={(e) => setNewCustomerAddress(e.target.value)}
                    />
                    <Input
                      placeholder="GSTIN (optional)"
                      value={newCustomerGstin}
                      onChange={(e) => setNewCustomerGstin(e.target.value)}
                    />
                    <Select value={newCustomerState} onChange={(e) => setNewCustomerState(e.target.value)}>
                      <option value="">State (optional)</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s.code} value={s.name}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCustomerMode(false);
                        setNewCustomerName("");
                        setNewCustomerPhone("");
                        setNewCustomerEmail("");
                        setNewCustomerAddress("");
                        setNewCustomerGstin("");
                        setNewCustomerState("");
                      }}
                      className="text-xs font-medium text-sky-600 hover:underline"
                    >
                      Choose an existing customer instead
                    </button>
                  </div>
                ) : (
                  <>
                    <Select required value={customerId} onChange={(e) => handleCustomerChange(e.target.value)}>
                      <option value="">Select a customer</option>
                      {!existingQuote && <option value="__new__">+ Add New Customer</option>}
                      {customers.data?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                    </Select>
                    {customerId && (
                      <div className="mt-2">
                        <label className="mb-1 block text-xs font-medium text-neutral-600">Customer GSTIN</label>
                        <Input
                          placeholder="e.g. 29AAHCT6977H1ZK"
                          value={customerGstin}
                          onChange={(e) => setCustomerGstin(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )
              ) : (
                <>
                  <Select required value={b2bAccountId} onChange={(e) => handleB2bChange(e.target.value)}>
                    <option value="">Select a B2B account</option>
                    {b2bAccounts.data?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                  {b2bAccountId && (
                    <div className="mt-2">
                      <label className="mb-1 block text-xs font-medium text-neutral-600">Account GSTIN</label>
                      <Input
                        placeholder="e.g. 29AAHCT6977H1ZK"
                        value={b2bAccountGstin}
                        onChange={(e) => setB2bAccountGstin(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Ship To Address</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
                <p className="mt-1 text-xs text-neutral-400">
                  Pre-fills from the selected party&apos;s shipping/billing address — editable per quote.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Quote Date</label>
                <Input type="date" required value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Valid Until</label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Place of Supply</label>
                <Select value={placeOfSupplyState} onChange={(e) => setPlaceOfSupplyState(e.target.value)}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-visible p-0">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-neutral-900">Items</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="w-10 px-5 py-2">#</th>
                  <th className="px-2 py-2">Item</th>
                  <th className="w-24 px-2 py-2">HSN/SAC</th>
                  <th className="w-20 px-2 py-2">Qty</th>
                  <th className="w-28 px-2 py-2">Rate (₹)</th>
                  <th className="w-24 px-2 py-2">Discount (₹)</th>
                  {isIntraState ? (
                    <>
                      <th className="w-24 px-2 py-2">CGST</th>
                      <th className="w-24 px-2 py-2">SGST</th>
                    </>
                  ) : (
                    <th className="w-24 px-2 py-2">IGST</th>
                  )}
                  <th className="w-28 px-2 py-2 text-right">Amount</th>
                  <th className="w-10 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={i} className="border-b border-neutral-100 align-top last:border-0">
                    <td className="px-5 py-3 text-neutral-400">{i + 1}</td>
                    <td className="px-2 py-3">
                      <Select
                        required
                        value={row.productId}
                        onChange={(e) => handleProductChange(i, e.target.value)}
                      >
                        <option value="">Select a product</option>
                        {products.data?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-3 text-xs text-neutral-500">{row.hsnCode || "—"}</td>
                    <td className="px-2 py-3">
                      <Input
                        type="number"
                        min="1"
                        required
                        value={row.quantity}
                        onChange={(e) => updateItem(i, { quantity: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={row.unitPrice}
                        onChange={(e) => updateItem(i, { unitPrice: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.discount}
                        onChange={(e) => updateItem(i, { discount: e.target.value })}
                      />
                    </td>
                    {isIntraState ? (
                      <>
                        <td className="px-2 py-3 text-xs text-neutral-500">
                          {row.gstRate ? `${num(row.gstRate) / 2}%` : "—"}
                          <br />
                          {formatCurrency(lineCalcs[i].cgst)}
                        </td>
                        <td className="px-2 py-3 text-xs text-neutral-500">
                          {row.gstRate ? `${num(row.gstRate) / 2}%` : "—"}
                          <br />
                          {formatCurrency(lineCalcs[i].sgst)}
                        </td>
                      </>
                    ) : (
                      <td className="px-2 py-3 text-xs text-neutral-500">
                        {row.gstRate ? `${num(row.gstRate)}%` : "—"}
                        <br />
                        {formatCurrency(lineCalcs[i].igst)}
                      </td>
                    )}
                    <td className="px-2 py-3 text-right font-medium text-neutral-900">
                      {formatCurrency(lineCalcs[i].taxable)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                          aria-label="Remove item"
                          title="Remove item"
                          className="text-neutral-400 transition-colors hover:text-red-600"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-neutral-200 px-5 py-3">
            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, { ...EMPTY_ROW }])}
              className="text-sm font-medium text-sky-600 hover:text-sky-700"
            >
              + Add Item
            </button>
          </div>

          <div className="flex justify-end border-t border-neutral-200 px-5 py-4">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Sub Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Discount</span>
                <span>− {formatCurrency(discountTotal)}</span>
              </div>
              {isIntraState ? (
                <>
                  <div className="flex justify-between text-neutral-600">
                    <span>CGST</span>
                    <span>{formatCurrency(cgstTotal)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>SGST</span>
                    <span>{formatCurrency(sgstTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-neutral-600">
                  <span>IGST</span>
                  <span>{formatCurrency(igstTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Rounding</span>
                <span>{formatCurrency(roundingAdjustment)}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold text-neutral-900">
                <span>Total</span>
                <span className="text-sky-600">{formatCurrency(total)}</span>
              </div>
              <p className="pt-1 text-xs italic text-neutral-500">{amountInWords(total)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                value={notes}
                onChange={(e) => {
                  setNotesTouched(true);
                  setNotes(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Terms &amp; Conditions</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                value={termsAndConditions}
                onChange={(e) => {
                  setTermsTouched(true);
                  setTermsAndConditions(e.target.value);
                }}
              />
            </div>
          </div>
        </Card>

        {error && <ErrorMessage message={error} />}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(existingQuote ? `/quotes/${existingQuote.id}` : "/quotes")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? "Saving…" : existingQuote ? "Save Changes" : "Save Quote"}
          </Button>
        </div>
      </form>
    </div>
  );
}
