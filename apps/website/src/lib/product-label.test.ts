import { describe, expect, it } from "vitest";
import { productLabel } from "./product-label";

describe("productLabel", () => {
  it("returns an empty string when no product is given", () => {
    expect(productLabel(undefined)).toBe("");
  });

  it("returns the bare name when the product has no brand", () => {
    expect(productLabel({ name: "Designer Chimney 90cm" })).toBe("Designer Chimney 90cm");
  });

  it("prepends the brand name when the product name doesn't already include it", () => {
    expect(productLabel({ name: "Island Chimney Hood 90cm", brand: { name: "Siemens" } })).toBe(
      "Siemens Island Chimney Hood 90cm",
    );
  });

  it("does not double up the brand when the name already starts with it", () => {
    expect(productLabel({ name: "Faber Designer Chimney 90cm", brand: { name: "Faber" } })).toBe(
      "Faber Designer Chimney 90cm",
    );
  });

  it("matches the brand prefix case-insensitively", () => {
    expect(productLabel({ name: "faber designer chimney 90cm", brand: { name: "Faber" } })).toBe(
      "faber designer chimney 90cm",
    );
  });
});
