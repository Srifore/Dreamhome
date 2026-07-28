import Link from "next/link";
import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import { BRAND_PORTFOLIO, COMPANY, PILLARS, WHO_WE_SERVE } from "@/lib/content";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-sky-500/25 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-28 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-sky-400">
            {COMPANY.strapline}
          </p>
          <h1 className="mb-5 text-4xl font-semibold leading-tight sm:text-5xl">
            <span className="block">Dreamhome</span>
            <span className="block mt-3">Kitchen Appliances</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-300">{COMPANY.description}</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/products"
              className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm shadow-sky-500/30 transition-colors hover:bg-sky-400"
            >
              Explore Products
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-sky-400/40 px-6 py-3 text-sm font-medium text-sky-300 transition-colors hover:bg-slate-900"
            >
              Talk to Us
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-center text-2xl font-semibold text-slate-900">Four Pillars of Premium Living</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="overflow-hidden rounded-xl border border-slate-200 border-t-2 border-t-sky-500 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static curated asset in public/pillars */}
              <img src={pillar.image} alt={pillar.title} className="aspect-[4/3] w-full object-cover" />
              <div className="p-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">{pillar.title}</h3>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  {pillar.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-2 text-center text-2xl font-semibold text-slate-900">Our Brand Portfolio</h2>
          <p className="mb-10 text-center text-sm text-slate-500">
            Authorized retailer for the world&apos;s most trusted appliance brands.
          </p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {BRAND_PORTFOLIO.map((brand) => (
              <div
                key={brand.name}
                className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
              >
                <BrandMark name={brand.name} logoUrl={brand.logo} />
                <div>
                  <p className="font-semibold text-slate-900">{brand.name}</p>
                  <p className="text-xs text-slate-500">{brand.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-10 text-center text-2xl font-semibold text-slate-900">Who We Serve</h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {WHO_WE_SERVE.map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-center text-white">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-3 text-2xl font-semibold">Let&apos;s Build the Future of Luxury Living Together</h2>
          <p className="mb-8 text-slate-300">
            Visit our Malleswaram showroom or reach out — our team is ready to help you choose the right
            appliances for your project.
          </p>
          <Link
            href="/contact"
            className="rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm shadow-sky-500/30 transition-colors hover:bg-sky-400"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
