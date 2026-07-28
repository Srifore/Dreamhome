"use client";

import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { CompanySettings, IntegrationSetting, SimulateWhatsAppResult, SiteSettings } from "@/lib/types";
import {
  AccessRestricted,
  Badge,
  Button,
  Card,
  ErrorMessage,
  Input,
  Label,
  PageHeader,
  QueryError,
  Select,
} from "@/components/ui";
import { INDIAN_STATES } from "@/lib/indian-states";

const WEBHOOK_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001") + "/webhooks/whatsapp";

function fieldValue(setting: IntegrationSetting | undefined, key: string): string {
  return setting?.fields?.[key] ?? "";
}

const EMPTY_COMPANY_SETTINGS: CompanySettings = {
  legalName: null,
  gstin: null,
  address: null,
  city: null,
  state: null,
  pincode: null,
  phone: null,
  email: null,
  website: null,
  logoUrl: null,
  bankAccountName: null,
  bankAccountNumber: null,
  bankIfsc: null,
  bankName: null,
  bankBranch: null,
  defaultTermsAndConditions: null,
  defaultNotes: null,
};

function CompanySettingsForm({ companySettings }: { companySettings?: CompanySettings }) {
  const queryClient = useQueryClient();
  const c = companySettings ?? EMPTY_COMPANY_SETTINGS;
  const [form, setForm] = useState({
    legalName: c.legalName ?? "",
    gstin: c.gstin ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    pincode: c.pincode ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    website: c.website ?? "",
    bankAccountName: c.bankAccountName ?? "",
    bankAccountNumber: c.bankAccountNumber ?? "",
    bankIfsc: c.bankIfsc ?? "",
    bankName: c.bankName ?? "",
    bankBranch: c.bankBranch ?? "",
    defaultTermsAndConditions: c.defaultTermsAndConditions ?? "",
    defaultNotes: c.defaultNotes ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: () => api.put("/settings/company", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to save"),
  });

  const uploadLogo = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      return api.upload("/settings/company/logo", formData);
    },
    onSuccess: () => {
      setLogoError(null);
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      if (logoInputRef.current) logoInputRef.current.value = "";
    },
    onError: (err) => setLogoError(err instanceof ApiError ? err.message : "Failed to upload logo"),
  });

  const removeLogo = useMutation({
    mutationFn: () => api.delete("/settings/company/logo"),
    onSuccess: () => {
      setLogoError(null);
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
    },
    onError: (err) => setLogoError(err instanceof ApiError ? err.message : "Failed to remove logo"),
  });

  const textareaClass =
    "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30";

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-neutral-900">Business / GST Details</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Printed as the &quot;From&quot; details on every quote — legal name, GSTIN, registered address,
        and bank details for payment. Setting your state here is also what determines whether a
        quote charges CGST+SGST (same state as the customer) or IGST (different state).
      </p>

      <div className="mb-5 flex items-center gap-4 border-b border-neutral-100 pb-5">
        {c.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.logoUrl}
            alt="Company logo"
            className="h-16 w-16 rounded-lg border border-neutral-200 bg-white object-contain"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">
            No logo
          </div>
        )}
        <div>
          <Label>Company Logo</Label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={(e) => e.target.files?.[0] && uploadLogo.mutate(e.target.files[0])}
            className="text-xs"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Printed top-left on every quote and invoice. JPEG/PNG/WebP/SVG, max 2MB.
          </p>
          {uploadLogo.isPending && <p className="mt-1 text-xs text-neutral-500">Uploading…</p>}
          {c.logoUrl && (
            <button
              type="button"
              onClick={() => removeLogo.mutate()}
              disabled={removeLogo.isPending}
              className="mt-1 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              {removeLogo.isPending ? "Removing…" : "Remove logo"}
            </button>
          )}
          {logoError && <ErrorMessage message={logoError} />}
        </div>
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Legal Business Name</Label>
            <Input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} />
          </div>
          <div>
            <Label>GSTIN</Label>
            <Input
              placeholder="29AAHCT6977H1ZK"
              value={form.gstin}
              onChange={(e) => set("gstin", e.target.value)}
            />
          </div>
          <div>
            <Label>Pincode</Label>
            <Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Registered Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <Label>State</Label>
            <Select value={form.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">Select state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Bank Details
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Account Holder Name</Label>
              <Input
                value={form.bankAccountName}
                onChange={(e) => set("bankAccountName", e.target.value)}
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                value={form.bankAccountNumber}
                onChange={(e) => set("bankAccountNumber", e.target.value)}
              />
            </div>
            <div>
              <Label>IFSC</Label>
              <Input value={form.bankIfsc} onChange={(e) => set("bankIfsc", e.target.value)} />
            </div>
            <div>
              <Label>Bank Name</Label>
              <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Branch</Label>
              <Input value={form.bankBranch} onChange={(e) => set("bankBranch", e.target.value)} />
            </div>
          </div>
        </div>

        <div>
          <Label>Default Terms &amp; Conditions</Label>
          <textarea
            rows={4}
            className={textareaClass}
            placeholder="e.g. Prices are valid for 15 days from the quote date. 50% advance payment required to confirm the order."
            value={form.defaultTermsAndConditions}
            onChange={(e) => set("defaultTermsAndConditions", e.target.value)}
          />
          <p className="mt-1 text-xs text-neutral-400">
            Pre-fills every new quote — editable per quote afterward.
          </p>
        </div>
        <div>
          <Label>Default Notes</Label>
          <textarea
            rows={2}
            className={textareaClass}
            placeholder="e.g. We look forward to doing business with you."
            value={form.defaultNotes}
            onChange={(e) => set("defaultNotes", e.target.value)}
          />
        </div>

        {error && <ErrorMessage message={error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : saved ? "Saved ✓" : "Save Business Details"}
        </Button>
      </form>
    </Card>
  );
}

function SiteLocationSettingsForm({ siteSettings }: { siteSettings?: SiteSettings }) {
  const queryClient = useQueryClient();
  const [mapsUrl, setMapsUrl] = useState(siteSettings?.mapsUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.put("/settings/site", { mapsUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to save"),
  });

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-neutral-900">Showroom Location</h2>
      <p className="mb-4 text-xs text-neutral-500">
        The Google Maps link used by the map pin icon on the public website&apos;s header. Update this
        if the showroom ever relocates — leave it blank to fall back to the website&apos;s built-in
        default.
      </p>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
        className="space-y-3"
      >
        <div>
          <Label>Google Maps Link</Label>
          <Input
            placeholder="https://maps.app.goo.gl/…"
            value={mapsUrl}
            onChange={(e) => setMapsUrl(e.target.value)}
          />
        </div>
        {error && <ErrorMessage message={error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : saved ? "Saved ✓" : "Save Location"}
        </Button>
      </form>
    </Card>
  );
}

function WhatsAppSettingsForm({ setting }: { setting?: IntegrationSetting }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    phoneNumberId: fieldValue(setting, "phoneNumberId"),
    businessAccountId: fieldValue(setting, "businessAccountId"),
    accessToken: "",
    verifyToken: "",
    displayPhoneNumber: fieldValue(setting, "displayPhoneNumber"),
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.put("/settings/integrations/whatsapp", form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to save"),
  });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">WhatsApp Business Cloud API</h2>
        {setting?.configured && <Badge tone={setting.isActive ? "green" : "neutral"}>Configured</Badge>}
      </div>

      <div className="mb-4 rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
        <p className="mb-1 font-medium text-neutral-700">Webhook Callback URL (paste into Meta Developer Console)</p>
        <p className="font-mono">{WEBHOOK_URL}</p>
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
        className="space-y-3"
      >
        <div>
          <Label>Phone Number ID</Label>
          <Input
            required
            value={form.phoneNumberId}
            onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
          />
        </div>
        <div>
          <Label>WhatsApp Business Account ID</Label>
          <Input
            required
            value={form.businessAccountId}
            onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
          />
        </div>
        <div>
          <Label>Display Phone Number</Label>
          <Input
            placeholder="+91 98450 59388"
            value={form.displayPhoneNumber}
            onChange={(e) => setForm({ ...form, displayPhoneNumber: e.target.value })}
          />
        </div>
        <div>
          <Label>Access Token</Label>
          <Input
            type="password"
            required={!setting?.configured}
            placeholder={setting?.fields?.accessToken || "Permanent access token from Meta"}
            value={form.accessToken}
            onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
          />
          {setting?.configured && (
            <p className="mt-1 text-xs text-neutral-400">Leave blank to keep the current token.</p>
          )}
        </div>
        <div>
          <Label>Verify Token</Label>
          <Input
            type="password"
            required={!setting?.configured}
            placeholder={setting?.fields?.verifyToken || "A secret string you choose"}
            value={form.verifyToken}
            onChange={(e) => setForm({ ...form, verifyToken: e.target.value })}
          />
          {setting?.configured && (
            <p className="mt-1 text-xs text-neutral-400">Leave blank to keep the current token.</p>
          )}
        </div>
        {error && <ErrorMessage message={error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save WhatsApp Settings"}
        </Button>
      </form>
    </Card>
  );
}

function InstagramSettingsForm({ setting }: { setting?: IntegrationSetting }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    accessToken: "",
    businessAccountId: fieldValue(setting, "businessAccountId"),
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.put("/settings/integrations/instagram", form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to save"),
  });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Instagram</h2>
        {setting?.configured && <Badge tone={setting.isActive ? "green" : "neutral"}>Configured</Badge>}
      </div>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
        className="space-y-3"
      >
        <div>
          <Label>Instagram Business Account ID</Label>
          <Input
            required
            value={form.businessAccountId}
            onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })}
          />
        </div>
        <div>
          <Label>Access Token</Label>
          <Input
            type="password"
            required={!setting?.configured}
            placeholder={setting?.fields?.accessToken || "Access token from your Meta Developer App"}
            value={form.accessToken}
            onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
          />
          {setting?.configured && (
            <p className="mt-1 text-xs text-neutral-400">Leave blank to keep the current token.</p>
          )}
        </div>
        {error && <ErrorMessage message={error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save Instagram Settings"}
        </Button>
      </form>
    </Card>
  );
}

function FacebookSettingsForm({ setting }: { setting?: IntegrationSetting }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ accessToken: "", pageId: fieldValue(setting, "pageId") });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.put("/settings/integrations/facebook", form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integrations"] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to save"),
  });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Facebook</h2>
        {setting?.configured && <Badge tone={setting.isActive ? "green" : "neutral"}>Configured</Badge>}
      </div>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
        className="space-y-3"
      >
        <div>
          <Label>Facebook Page ID</Label>
          <Input required value={form.pageId} onChange={(e) => setForm({ ...form, pageId: e.target.value })} />
        </div>
        <div>
          <Label>Access Token</Label>
          <Input
            type="password"
            required={!setting?.configured}
            placeholder={setting?.fields?.accessToken || "Page access token from your Meta Developer App"}
            value={form.accessToken}
            onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
          />
          {setting?.configured && (
            <p className="mt-1 text-xs text-neutral-400">Leave blank to keep the current token.</p>
          )}
        </div>
        {error && <ErrorMessage message={error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save Facebook Settings"}
        </Button>
      </form>
    </Card>
  );
}

function AiIntegrationSettingsForm({ setting }: { setting?: IntegrationSetting }) {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.put("/settings/integrations/ai-image", { apiKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setApiKey("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to save"),
  });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">AI Integration</h2>
        {setting?.configured && <Badge tone={setting.isActive ? "green" : "neutral"}>Configured</Badge>}
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        One OpenAI API key powers two optional features: re-staging a product&apos;s real photo into a
        new AI-generated scene on the Marketing page, and letting the WhatsApp bot hold a genuine
        conversation about your products (grounded only in your real catalog). If this isn&apos;t
        configured — or a request fails — both features simply fall back to their existing behavior
        (the real product photo as-is, and the rule-based WhatsApp replies).
      </p>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setError(null);
          mutation.mutate();
        }}
        className="space-y-3"
      >
        <div>
          <Label>OpenAI API Key</Label>
          <Input
            type="password"
            required={!setting?.configured}
            placeholder={setting?.fields?.apiKey || "sk-..."}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          {setting?.configured && (
            <p className="mt-1 text-xs text-neutral-400">Leave blank to keep the current key.</p>
          )}
        </div>
        {error && <ErrorMessage message={error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save AI Image Settings"}
        </Button>
      </form>
    </Card>
  );
}

function SimulatePanel() {
  const [phone, setPhone] = useState("+91 9900011122");
  const [name, setName] = useState("Test Customer");
  const [message, setMessage] = useState("hi");
  const [result, setResult] = useState<SimulateWhatsAppResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post<SimulateWhatsAppResult>("/whatsapp/simulate", { phone, name, message }),
    onSuccess: (data) => setResult(data),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Simulation failed"),
  });

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-neutral-900">Simulate an Incoming WhatsApp Message</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Test the auto-reply bot without needing a live Meta webhook — this runs the exact same logic that
        processes real incoming messages.
      </p>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          setError(null);
          setResult(null);
          mutation.mutate();
        }}
        className="mb-4 space-y-3"
      >
        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Customer Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex-1">
            <Label>Customer Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Message</Label>
          <Input name="message" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        {error && <ErrorMessage message={error} />}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Sending…" : "Send Test Message"}
        </Button>
      </form>

      {result && (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
          <p className="mb-1 text-xs font-medium text-neutral-500">Bot reply:</p>
          <p className="whitespace-pre-wrap text-sm text-neutral-900">{result.replyText}</p>
          {(result.customerId || result.leadId) && (
            <p className="mt-3 text-xs text-neutral-500">
              {result.customerId && `Matched customer ${result.customerId}. `}
              {result.leadId && `Lead ${result.leadId} created/updated — check the Leads pipeline.`}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  // Admin-only, regardless of a Supervisor's granted permissions — integration credentials and
  // the showroom location link are business config an Admin shouldn't delegate.
  const canManage = hasPermission("*");

  const integrations = useQuery({
    queryKey: ["integrations"],
    queryFn: () => api.get<IntegrationSetting[]>("/settings/integrations"),
    enabled: canManage,
  });
  const siteSettings = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => api.get<SiteSettings>("/settings/site"),
    enabled: canManage,
  });
  const companySettings = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => api.get<CompanySettings>("/settings/company"),
    enabled: canManage,
  });

  const byProvider = new Map(integrations.data?.map((i) => [i.provider, i]));

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" />

      {!canManage && <AccessRestricted feature="Settings" />}
      {canManage && integrations.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {canManage && integrations.isError && (
        <QueryError error={integrations.error} onRetry={() => integrations.refetch()} />
      )}

      {canManage && !companySettings.isLoading && !companySettings.isError && (
        <CompanySettingsForm companySettings={companySettings.data} />
      )}

      {canManage && !siteSettings.isLoading && !siteSettings.isError && (
        <SiteLocationSettingsForm siteSettings={siteSettings.data} />
      )}

      {canManage && !integrations.isLoading && !integrations.isError && (
        <>
          <WhatsAppSettingsForm setting={byProvider.get("WHATSAPP")} />
          <SimulatePanel />
          <InstagramSettingsForm setting={byProvider.get("INSTAGRAM")} />
          <FacebookSettingsForm setting={byProvider.get("FACEBOOK")} />
          <AiIntegrationSettingsForm setting={byProvider.get("AI_IMAGE")} />
        </>
      )}
    </div>
  );
}
