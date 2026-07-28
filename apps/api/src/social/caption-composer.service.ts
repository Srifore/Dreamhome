import { Injectable } from "@nestjs/common";
import { productLabel } from "../common/utils/product-label";

const OPENERS = [
  "✨ Elevate your kitchen with the {product}.",
  "🏠 Meet the {product} — a new favorite at DreamHome.",
  "🔥 Spotlight: the {product} from {brand}.",
  "💎 Designed for modern living: the {product}.",
  "🌟 Featured this week — the {product}.",
];

const BODIES = [
  "Part of our curated {category} collection, built for homeowners, architects, and designers who want performance without compromise.",
  "Handpicked for our showroom because it brings both design and durability to your {category_lower}.",
  "A perfect fit for premium homes, renovation projects, and everything in between.",
  "Backed by expert consultation, professional installation, and DreamHome's dedicated after-sales support.",
];

const CTAS = [
  "📩 DM us or call +91 98450 59388 for pricing, availability, and offers.",
  "📍 Visit our Malleswaram showroom or send an enquiry — pricing shared by our consultants.",
  "☎️ Call +91 98450 59388 to book a consultation and get the best price for your home.",
];

function pick<T>(items: T[], seed: number): T {
  return items[seed % items.length];
}

export interface CaptionInput {
  productName: string;
  brandName: string;
  categoryName: string;
}

@Injectable()
export class CaptionComposerService {
  compose(input: CaptionInput, variantSeed: number = Date.now()): string {
    const product = productLabel({ name: input.productName, brand: { name: input.brandName } });
    const opener = pick(OPENERS, variantSeed)
      .replace("{product}", product)
      .replace("{brand}", input.brandName);
    const body = pick(BODIES, variantSeed + 1)
      .replace("{category}", input.categoryName)
      .replace("{category_lower}", input.categoryName.toLowerCase());
    const cta = pick(CTAS, variantSeed + 2);

    const hashtags = [
      "#DreamHome",
      `#${input.brandName.replace(/\s+/g, "")}`,
      `#${input.categoryName.replace(/\s+/g, "")}`,
      "#BengaluruHomes",
      "#PremiumAppliances",
      "#LuxuryLiving",
    ].join(" ");

    return [opener, "", body, "", cta, "", hashtags].join("\n");
  }
}
