import type { MetadataRoute } from "next";
import { apiGet } from "@/lib/api";
import type { Product } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/products", priority: 0.9, changeFrequency: "daily" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const products = await apiGet<Product[]>("/public/products").catch(() => []);
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
