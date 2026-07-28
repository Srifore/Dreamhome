export interface SiteSettings {
  mapsUrl: string | null;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
}

// The category nested on a Product is a lighter projection (see PUBLIC_PRODUCT_SELECT on
// the API) — it never includes parentId/children, unlike the standalone /public/categories
// response used for the filter dropdown.
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
}

// Deliberately no `price` or `sku` — pricing is enquiry-driven and only shared once a
// staff member issues a formal quote, so the public API never returns it.
export interface Product {
  id: string;
  name: string;
  modelNumber: string | null;
  description: string | null;
  images: string[];
  features: string[];
  manualUrl: string | null;
  brand: Brand;
  category: ProductCategory;
}
