import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductGallery } from "@/components/product-gallery";
import { ProductEnquiryButton } from "@/components/product-enquiry-button";
import { jsonLdScript } from "@/lib/json-ld";
import { productLabel } from "@/lib/product-label";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

async function getProduct(id: string): Promise<Product | null> {
  try {
    return await apiGet<Product>(`/public/products/${id}`);
  } catch (err) {
    // Only a genuine 404 means "this product doesn't exist" — anything else (the API being
    // briefly unreachable, a 500, a network blip) should surface as a real error instead of
    // silently rendering a 404 page that could get a valid, previously-indexed URL deindexed.
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product not found" };

  const title = productLabel(product);
  const description =
    product.description ??
    `${product.brand.name} ${product.name} — premium ${product.category.name.toLowerCase()} available at DreamHome, Bengaluru's premium kitchen and home appliance showroom.`;
  const canonical = `/products/${id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: product.images.length ? product.images : undefined,
    },
  };
}

// No `offers`/price here by design — DreamHome's model is enquiry-driven, so a price would
// either be fabricated or immediately stale. Google's rich-result eligibility for Product just
// degrades gracefully to the basic fields when price/availability are absent.
function productJsonLd(product: Product, id: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productLabel(product),
    description: product.description ?? undefined,
    image: product.images.length ? product.images : undefined,
    sku: product.modelNumber ?? undefined,
    brand: { "@type": "Brand", name: product.brand.name },
    category: product.category.name,
    url: `${SITE_URL}/products/${id}`,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger -- JSON-LD, escaped by jsonLdScript
        dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product, id)) }}
      />
      <div className="grid gap-10 sm:grid-cols-2">
        <ProductGallery
          images={product.images}
          brandName={product.brand.name}
          brandLogoUrl={product.brand.logoUrl}
          productName={product.name}
        />

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-600">{product.brand.name}</p>
          <h1 className="mb-2 mt-1 text-2xl font-semibold text-slate-900">{product.name}</h1>
          <p className="mb-4 text-sm text-slate-500">{product.category.name}</p>
          {product.modelNumber && (
            <p className="mb-4 text-sm text-slate-500">Model: {product.modelNumber}</p>
          )}
          {product.description && <p className="mb-4 text-sm text-slate-700">{product.description}</p>}

          <div>
            <ProductEnquiryButton productId={product.id} productName={productLabel(product)} />
          </div>

          {product.features.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Features &amp; Advantages
              </p>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {product.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-sky-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.manualUrl && (
            <a
              href={product.manualUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-4 inline-block text-sm font-medium text-sky-600 underline"
            >
              Download Product Manual
            </a>
          )}

          <p className="text-sm font-medium text-slate-500">
            Pricing shared on request — contact us and our team will follow up with a quote.
          </p>
        </div>
      </div>
    </div>
  );
}
