import type { Metadata } from "next";
import { COMPANY } from "@/lib/content";
import { EnquiryForm } from "@/components/enquiry-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with ${COMPANY.name} — visit our Malleswaram showroom or send us an enquiry.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="mb-8 text-2xl font-semibold text-slate-900">Contact Us</h1>
      <div className="grid gap-10 sm:grid-cols-2">
        <div className="space-y-6 text-sm text-slate-700">
          <div>
            <p className="font-semibold text-sky-600">Showroom Address</p>
            <p>{COMPANY.address}</p>
          </div>
          <div>
            <p className="font-semibold text-sky-600">Phone</p>
            <p>{COMPANY.phone}</p>
          </div>
          <div>
            <p className="font-semibold text-sky-600">Email</p>
            <p>{COMPANY.email}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Send an Enquiry</h2>
          <EnquiryForm />
        </div>
      </div>
    </div>
  );
}
