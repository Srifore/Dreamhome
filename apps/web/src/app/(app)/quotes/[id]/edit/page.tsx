"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { Quote } from "@/lib/types";
import { QueryError } from "@/components/ui";
import { QuoteForm } from "@/components/quote-form";

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const quote = useQuery({ queryKey: ["quotes", id], queryFn: () => api.get<Quote>(`/sales/quotes/${id}`) });

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

  return <QuoteForm existingQuote={quote.data} />;
}
