import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { COMPANY } from "@/lib/content";
import { jsonLdScript } from "@/lib/json-ld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${COMPANY.name} — ${COMPANY.tagline}`, template: `%s — ${COMPANY.name}` },
  description: COMPANY.description,
  openGraph: {
    type: "website",
    siteName: COMPANY.name,
    locale: "en_IN",
    title: `${COMPANY.name} — ${COMPANY.tagline}`,
    description: COMPANY.description,
    images: ["/dreamhome-logo.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${COMPANY.name} — ${COMPANY.tagline}`,
    description: COMPANY.description,
    images: ["/dreamhome-logo.jpg"],
  },
};

// Helps Google show a Knowledge Panel / local pack entry for showroom searches — no opening
// hours or geo-coordinates included since none were provided (fabricating them would mislead
// customers more than omitting them).
const LOCAL_BUSINESS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "HomeGoodsStore",
  name: COMPANY.name,
  description: COMPANY.description,
  image: `${SITE_URL}/dreamhome-logo.jpg`,
  url: SITE_URL,
  telephone: COMPANY.phone,
  email: COMPANY.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: COMPANY.address,
    addressLocality: "Bengaluru",
    addressRegion: "Karnataka",
    addressCountry: "IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-slate-900">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- JSON-LD, escaped by jsonLdScript
          dangerouslySetInnerHTML={{ __html: jsonLdScript(LOCAL_BUSINESS_JSON_LD) }}
        />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
