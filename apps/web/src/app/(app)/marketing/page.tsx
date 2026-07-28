"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { SocialPost } from "@/lib/types";
import { AccessRestricted, Badge, Button, Card, EmptyState, ErrorMessage, PageHeader, QueryError } from "@/components/ui";
import { productLabel } from "@/lib/product-label";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function imageUrl(postId: string) {
  return `${API_URL}/social-posts/${postId}/image`;
}

const STATUS_TONE: Record<string, "neutral" | "green" | "red" | "amber" | "blue"> = {
  PENDING_REVIEW: "amber",
  POSTED: "green",
  DISCARDED: "neutral",
};

function PendingReview({
  post,
  onProceeded,
}: {
  post: SocialPost | null;
  onProceeded: (post: SocialPost) => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: () => api.post<SocialPost>("/social-posts/generate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to generate"),
  });

  const regenerate = useMutation({
    mutationFn: (id: string) => api.post<SocialPost>(`/social-posts/${id}/regenerate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to regenerate"),
  });

  const proceed = useMutation({
    mutationFn: (id: string) => api.post<SocialPost>(`/social-posts/${id}/proceed`),
    onSuccess: (updatedPost) => {
      queryClient.invalidateQueries({ queryKey: ["social-posts"] });
      setError(null);
      onProceeded(updatedPost);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Failed to post"),
  });

  if (!post) {
    return (
      <Card className="mb-6">
        <p className="mb-3 text-sm text-neutral-600">
          No post is currently queued for review. Generate today&apos;s product graphic to get started.
        </p>
        {error && (
          <div className="mb-3">
            <ErrorMessage message={error} />
          </div>
        )}
        <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
          {generate.isPending ? "Generating…" : "Generate Now"}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Today&apos;s Post — Pending Review</h2>
        <Badge tone="amber">PENDING REVIEW</Badge>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <img
          src={imageUrl(post.id)}
          alt={post.product?.name ?? "Generated product post"}
          className="w-full rounded-md border border-neutral-200"
        />
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">
            Featuring: {productLabel(post.product)}
          </p>
          <p className="whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
            {post.caption}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => proceed.mutate(post.id)} disabled={proceed.isPending}>
          {proceed.isPending ? "Posting…" : "Proceed — Post to Instagram & Facebook"}
        </Button>
        <a href={`${imageUrl(post.id)}?download=1`} download={`dreamhome-post-${post.id}.jpg`}>
          <Button variant="secondary">Download</Button>
        </a>
        <Button
          variant="secondary"
          onClick={() => regenerate.mutate(post.id)}
          disabled={regenerate.isPending}
        >
          {regenerate.isPending ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>
    </Card>
  );
}

function ProceedResultBanner({ post, onDismiss }: { post: SocialPost; onDismiss: () => void }) {
  const instagramOk = !!post.postedToInstagramAt;
  const facebookOk = !!post.postedToFacebookAt;
  const allOk = instagramOk && facebookOk;

  return (
    <Card className={`mb-6 border ${allOk ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            {allOk ? "Posted to Instagram and Facebook." : "Posting finished with some failures."}
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-neutral-600">
            <li>Instagram: {instagramOk ? "Posted ✓" : `Failed — ${post.instagramError ?? "unknown error"}`}</li>
            <li>Facebook: {facebookOk ? "Posted ✓" : `Failed — ${post.facebookError ?? "unknown error"}`}</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-medium text-neutral-400 hover:text-neutral-700"
        >
          Dismiss
        </button>
      </div>
    </Card>
  );
}

export default function MarketingPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("social:manage");
  const [proceedResult, setProceedResult] = useState<SocialPost | null>(null);

  const pending = useQuery({
    queryKey: ["social-posts", "latest-pending"],
    queryFn: () => api.get<SocialPost | null>("/social-posts/latest-pending"),
    enabled: canManage,
  });
  const history = useQuery({
    queryKey: ["social-posts"],
    queryFn: () => api.get<SocialPost[]>("/social-posts"),
    enabled: canManage,
  });

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Marketing" />
        <AccessRestricted feature="Marketing" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Marketing" />

      {proceedResult && (
        <ProceedResultBanner post={proceedResult} onDismiss={() => setProceedResult(null)} />
      )}

      {pending.isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {pending.isError && <QueryError error={pending.error} onRetry={() => pending.refetch()} />}
      {!pending.isLoading && !pending.isError && (
        <PendingReview post={pending.data ?? null} onProceeded={setProceedResult} />
      )}

      <h2 className="mb-3 text-sm font-semibold text-neutral-900">History</h2>
      {history.isError && <QueryError error={history.error} onRetry={() => history.refetch()} />}
      {history.data?.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs font-medium text-neutral-500">
              <tr>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Generated</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Instagram</th>
                <th className="px-4 py-2">Facebook</th>
              </tr>
            </thead>
            <tbody>
              {history.data.map((post) => (
                <tr key={post.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-2">{productLabel(post.product)}</td>
                  <td className="px-4 py-2">{new Date(post.generatedAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Badge tone={STATUS_TONE[post.status]}>{post.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {post.postedToInstagramAt
                      ? "Posted"
                      : post.instagramError
                        ? `Failed: ${post.instagramError}`
                        : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {post.postedToFacebookAt
                      ? "Posted"
                      : post.facebookError
                        ? `Failed: ${post.facebookError}`
                        : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState message="No posts generated yet." />
      )}
    </div>
  );
}
