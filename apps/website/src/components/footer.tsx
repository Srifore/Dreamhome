import Image from "next/image";
import { COMPANY } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-14 text-sm text-slate-400">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <Image
                src="/dreamhome-logo.jpg"
                alt={COMPANY.name}
                width={32}
                height={32}
                className="rounded-full"
              />
              <p className="font-semibold text-sky-400">{COMPANY.name}</p>
            </div>
            <p>{COMPANY.strapline}</p>
          </div>
          <div>
            <p className="mb-3 font-semibold text-sky-400">Showroom</p>
            <p>{COMPANY.address}</p>
          </div>
          <div>
            <p className="mb-3 font-semibold text-sky-400">Contact</p>
            <p>{COMPANY.phone}</p>
            <p>{COMPANY.email}</p>
          </div>
        </div>
        <p className="mt-10 text-xs text-slate-600">
          © {new Date().getFullYear()} {COMPANY.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
