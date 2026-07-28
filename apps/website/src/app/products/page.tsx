import Link from "next/link";
import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import { apiGet } from "@/lib/api";
import type { Brand, Category, Product } from "@/lib/types";
import { productLabel } from "@/lib/product-label";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse DreamHome's curated collection of premium kitchen and home appliances.",
  alternates: { canonical: "/products" },
};

interface SearchParams {
  brandId?: string;
  categorySlug?: string;
  search?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.brandId) query.set("brandId", params.brandId);
  if (params.categorySlug) query.set("categorySlug", params.categorySlug);
  if (params.search) query.set("search", params.search);

  // Filters are a nice-to-have — if brands/categories fail to load, still show the product
  // grid rather than taking down the whole page. A failure to load products themselves is
  // the one thing that should surface as a real error (handled by error.tsx).
  const [products, brands, categories] = await Promise.all([
    apiGet<Product[]>(`/public/products?${query.toString()}`),
    apiGet<Brand[]>("/public/brands").catch(() => []),
    apiGet<Category[]>("/public/categories").catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <h1 className="mb-8 text-2xl font-semibold text-slate-900">Our Products</h1>

      <form className="mb-10 flex flex-wrap gap-3" method="get">
        <input
          type="text"
          name="search"
          placeholder="Search products…"
          defaultValue={params.search}
          className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
        <select
          name="brandId"
          defaultValue={params.brandId ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          name="categorySlug"
          defaultValue={params.categorySlug ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        >
          <option value="">All Categories</option>
          {categories.flatMap((c) => [c, ...(c.children ?? [])]).map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700"
        >
          Filter
        </button>
      </form>

      {products.length === 0 ? (
        <p className="text-sm text-slate-500">No products match your filters yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
            >
              {p.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary external product photo URLs
                <img src={p.images[0]} alt={productLabel(p)} className="aspect-video w-full object-cover" />
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-slate-950 px-4 text-center">
                  <BrandMark name={p.brand.name} logoUrl={p.brand.logoUrl} size="sm" />
                  <p className="text-sm font-medium text-white">{productLabel(p)}</p>
                </div>
              )}
              <div className="p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-sky-600">{p.brand.name}</p>
                <h2 className="mt-1 mb-2 font-semibold text-slate-900">{p.name}</h2>
                <p className="mb-3 text-xs text-slate-500">{p.category.name}</p>
                <p className="text-sm font-medium text-slate-700">Enquire for pricing →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
