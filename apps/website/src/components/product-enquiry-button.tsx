"use client";

import { useEffect, useState } from "react";
import { EnquiryForm } from "@/components/enquiry-form";

export function ProductEnquiryButton({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);

  // Esc closes the modal, and scroll stays locked to the page behind it while it's open.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700"
      >
        Enquire About This Product
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Enquire About This Product</h2>
                <p className="mt-1 text-sm text-slate-500">{productName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <EnquiryForm productId={productId} productName={productName} />
          </div>
        </div>
      )}
    </>
  );
}
