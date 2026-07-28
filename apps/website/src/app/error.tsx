"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <h1 className="mb-3 text-xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mb-6 text-sm text-slate-500">
        We couldn&apos;t load this page. Please try again, or call us at +91 98450 59388.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700"
      >
        Try again
      </button>
    </div>
  );
}
