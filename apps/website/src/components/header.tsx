import Image from "next/image";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { COMPANY } from "@/lib/content";
import type { SiteSettings } from "@/lib/types";

// Admin-configurable via the CRM's Settings page (in case the showroom relocates); falls back
// to the hardcoded link above if unset or the API is briefly unreachable.
async function getMapsUrl(): Promise<string> {
  try {
    const settings = await apiGet<SiteSettings>("/public/site-settings");
    return settings.mapsUrl || COMPANY.mapsUrl;
  } catch {
    return COMPANY.mapsUrl;
  }
}

export async function Header() {
  const mapsUrl = await getMapsUrl();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/dreamhome-logo.jpg"
            alt={COMPANY.name}
            width={40}
            height={40}
            className="rounded-full"
          />
          <span className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight text-slate-900">{COMPANY.name}</span>
            <span className="text-xs text-slate-500">{COMPANY.tagline}</span>
          </span>
        </Link>
        <nav className="flex items-center gap-7 text-sm font-medium text-slate-600">
          <Link href="/" className="transition-colors hover:text-sky-600">
            Home
          </Link>
          <Link href="/products" className="transition-colors hover:text-sky-600">
            Products
          </Link>
          <Link href="/contact" className="transition-colors hover:text-sky-600">
            Contact
          </Link>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Find us on Google Maps"
            title="Find us on Google Maps"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-sky-300 hover:text-sky-600"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 5.25 6.36 11.34 6.63 11.6a1.2 1.2 0 0 0 1.74 0c.27-.26 6.63-6.35 6.63-11.6C19.5 5.36 16.14 2 12 2Zm0 10.25a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5Z" />
            </svg>
          </a>
          <a
            href={`tel:${COMPANY.phone.replace(/\s+/g, "")}`}
            className="rounded-full bg-sky-600 px-5 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-sky-700"
          >
            {COMPANY.phone}
          </a>
        </nav>
      </div>
    </header>
  );
}
