import { describe, expect, it } from "vitest";
import { BRAND_PORTFOLIO, COMPANY, PILLARS, WHO_WE_SERVE } from "./content";

describe("COMPANY", () => {
  it("has non-empty core identity fields", () => {
    expect(COMPANY.name.trim()).not.toBe("");
    expect(COMPANY.tagline.trim()).not.toBe("");
    expect(COMPANY.strapline.trim()).not.toBe("");
    expect(COMPANY.description.trim()).not.toBe("");
    expect(COMPANY.address.trim()).not.toBe("");
  });

  it("has a valid, well-formed email address", () => {
    expect(COMPANY.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("has a phone number that yields only digits once punctuation is stripped (WhatsApp/tel links depend on this)", () => {
    const digits = COMPANY.phone.replace(/\D/g, "");
    expect(digits.length).toBeGreaterThanOrEqual(10);
    expect(digits).toMatch(/^\d+$/);
  });

  it("has a maps URL that is a valid absolute https URL", () => {
    expect(() => new URL(COMPANY.mapsUrl)).not.toThrow();
    expect(COMPANY.mapsUrl.startsWith("https://")).toBe(true);
  });
});

describe("PILLARS", () => {
  it("has exactly 4 entries (the homepage hard-codes a 4-column grid)", () => {
    expect(PILLARS).toHaveLength(4);
  });

  it("every pillar has a non-empty image path under /pillars/", () => {
    for (const pillar of PILLARS) {
      expect(pillar.image).toBeTruthy();
      expect(pillar.image.startsWith("/pillars/")).toBe(true);
    }
  });

  it("every pillar image has a real file extension (catches a typo'd path)", () => {
    for (const pillar of PILLARS) {
      expect(pillar.image).toMatch(/\.(jpg|jpeg|png|webp|avif)$/i);
    }
  });

  it("every pillar has a non-empty title", () => {
    for (const pillar of PILLARS) {
      expect(pillar.title.trim()).not.toBe("");
    }
  });

  it("every pillar has at least one item, and no item is blank", () => {
    for (const pillar of PILLARS) {
      expect(pillar.items.length).toBeGreaterThan(0);
      for (const item of pillar.items) {
        expect(item.trim()).not.toBe("");
      }
    }
  });

  it("has unique titles (used as React list keys on the homepage)", () => {
    const titles = PILLARS.map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("has unique image paths (a duplicate would mean two pillars show the same photo)", () => {
    const images = PILLARS.map((p) => p.image);
    expect(new Set(images).size).toBe(images.length);
  });
});

describe("WHO_WE_SERVE", () => {
  it("has exactly 4 entries (the homepage hard-codes a 4-column grid)", () => {
    expect(WHO_WE_SERVE).toHaveLength(4);
  });

  it("every entry has a non-empty title and description", () => {
    for (const entry of WHO_WE_SERVE) {
      expect(entry.title.trim()).not.toBe("");
      expect(entry.description.trim()).not.toBe("");
    }
  });

  it("has unique titles (used as React list keys on the homepage)", () => {
    const titles = WHO_WE_SERVE.map((w) => w.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe("BRAND_PORTFOLIO", () => {
  it("is non-empty", () => {
    expect(BRAND_PORTFOLIO.length).toBeGreaterThan(0);
  });

  it("every entry has a non-empty name, description, and logo path", () => {
    for (const brand of BRAND_PORTFOLIO) {
      expect(brand.name.trim()).not.toBe("");
      expect(brand.description.trim()).not.toBe("");
      expect(brand.logo.trim()).not.toBe("");
    }
  });

  it("every logo path lives under /brand-logos/", () => {
    for (const brand of BRAND_PORTFOLIO) {
      expect(brand.logo.startsWith("/brand-logos/")).toBe(true);
    }
  });

  it("has unique brand names (used as React list keys on the homepage)", () => {
    const names = BRAND_PORTFOLIO.map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has unique logo paths (a duplicate would mean two brands show the same logo)", () => {
    const logos = BRAND_PORTFOLIO.map((b) => b.logo);
    expect(new Set(logos).size).toBe(logos.length);
  });
});
