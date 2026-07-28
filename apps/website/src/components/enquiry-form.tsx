"use client";

import { useState, type FormEvent } from "react";
import { apiPost } from "@/lib/api";

export function EnquiryForm({ productId, productName }: { productId?: string; productName?: string }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      await apiPost("/public/enquiries", {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        message: form.message || undefined,
        productId,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Thank you! Our team will get back to you shortly
        {productName ? ` about the ${productName}` : ""}.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
        <input
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Message</label>
        <textarea
          rows={3}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : productId ? "Request a Quote" : "Send Enquiry"}
      </button>
    </form>
  );
}
