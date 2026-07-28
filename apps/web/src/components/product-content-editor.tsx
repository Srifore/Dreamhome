"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import { Button, Card, ErrorMessage, Input, Label } from "@/components/ui";

/**
 * Website-facing content (image gallery, description, features, manual) — everything a
 * customer sees when browsing this product on dreamhome's public site. A product only appears
 * on the public website once all four of these are filled in (enforced by the API's publish
 * gate), so this is the one place that completes a product for customer visibility.
 */
export function ProductContentEditor({ product }: { product: Product }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState(product.description ?? "");
  const [features, setFeatures] = useState<string[]>(product.features.length ? product.features : [""]);
  const [error, setError] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["products", product.id] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const saveDescription = useMutation({
    mutationFn: () => api.patch(`/inventory/products/${product.id}`, { description }),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to save description"),
  });

  const saveFeatures = useMutation({
    mutationFn: () =>
      api.patch(`/inventory/products/${product.id}`, {
        features: features.map((f) => f.trim()).filter(Boolean),
      }),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to save features"),
  });

  const uploadImages = useMutation({
    mutationFn: (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("images", file));
      return api.upload(`/inventory/products/${product.id}/images`, formData);
    },
    onSuccess: () => {
      invalidate();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to upload image(s)"),
  });

  const removeImage = useMutation({
    mutationFn: (url: string) => api.delete(`/inventory/products/${product.id}/images`, { url }),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to remove image"),
  });

  const uploadManual = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("manual", file);
      return api.upload(`/inventory/products/${product.id}/manual`, formData);
    },
    onSuccess: () => {
      invalidate();
      if (manualInputRef.current) manualInputRef.current.value = "";
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to upload manual"),
  });

  const removeManual = useMutation({
    mutationFn: () => api.delete(`/inventory/products/${product.id}/manual`),
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to remove manual"),
  });

  return (
    <Card className="mb-6 space-y-6">
      <div>
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Website Content</h2>
        <p className="mb-3 text-xs text-slate-500">
          Shown to customers browsing this product on the DreamHome website — never the price or stock.
          Description, features, and manual must be filled in before this product appears on the public
          site. A photo is optional — until you add one, the site shows a brand tile instead.
        </p>
      </div>

      {error && <ErrorMessage message={error} />}

      <div>
        <Label>Product Images (optional — shows a brand tile until you add one)</Label>
        <p className="mb-2 text-xs text-slate-500">
          Add up to 8 photos — customers can swipe through all of them on the website. Select
          several files at once (hold Ctrl/Cmd in the file picker), or upload more any time.
        </p>
        <div className="mb-2 flex flex-wrap gap-3">
          {product.images.map((url, i) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- server-hosted upload URL */}
              <img src={url} alt="" className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage.mutate(url)}
                disabled={removeImage.isPending}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white hover:bg-red-700"
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={product.images.length >= 8}
          onChange={(e) => e.target.files && uploadImages.mutate(e.target.files)}
          className="text-xs"
        />
        {product.images.length >= 8 && (
          <p className="mt-1 text-xs text-slate-500">Maximum of 8 photos reached — remove one to add another.</p>
        )}
        {uploadImages.isPending && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
      </div>

      <div>
        <Label>Description (required)</Label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
        <Button
          type="button"
          variant="secondary"
          className="mt-2"
          onClick={() => saveDescription.mutate()}
          disabled={saveDescription.isPending}
        >
          {saveDescription.isPending ? "Saving…" : "Save Description"}
        </Button>
      </div>

      <div>
        <Label>Features / Advantages (required)</Label>
        <div className="space-y-2">
          {features.map((feature, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={feature}
                onChange={(e) =>
                  setFeatures((prev) => prev.map((f, idx) => (idx === i ? e.target.value : f)))
                }
                placeholder="e.g. Auto-clean filterless technology"
              />
              {features.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setFeatures((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setFeatures((prev) => [...prev, ""])}>
            + Add Feature
          </Button>
          <Button type="button" onClick={() => saveFeatures.mutate()} disabled={saveFeatures.isPending}>
            {saveFeatures.isPending ? "Saving…" : "Save Features"}
          </Button>
        </div>
      </div>

      <div>
        <Label>Product Manual (PDF, required)</Label>
        {product.manualUrl ? (
          <div className="mb-2 flex items-center gap-3 text-sm">
            <a href={product.manualUrl} target="_blank" rel="noreferrer" className="text-sky-600 underline">
              View current manual
            </a>
            <Button
              type="button"
              variant="danger"
              onClick={() => removeManual.mutate()}
              disabled={removeManual.isPending}
            >
              Remove
            </Button>
          </div>
        ) : (
          <p className="mb-2 text-xs text-slate-500">No manual uploaded yet.</p>
        )}
        <input
          ref={manualInputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => e.target.files?.[0] && uploadManual.mutate(e.target.files[0])}
          className="text-xs"
        />
        {uploadManual.isPending && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
      </div>
    </Card>
  );
}

/**
 * Mirrors the API's publish gate (see PublicService.PUBLISHED_WHERE) so the CRM can show the
 * same "what's left" checklist before a product goes live on the website. A photo is
 * deliberately not included — the website falls back to a brand-monogram tile when there's no
 * image yet, so a missing photo doesn't block publishing.
 */
export function getMissingContentFields(product: Product): string[] {
  const missing: string[] = [];
  if (!product.description?.trim()) missing.push("Description");
  if (product.features.length === 0) missing.push("Features");
  if (!product.manualUrl) missing.push("Manual");
  return missing;
}
