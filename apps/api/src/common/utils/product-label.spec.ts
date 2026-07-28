import { productLabel } from "./product-label";

describe("productLabel", () => {
  it("prepends the brand when the product name doesn't already start with it", () => {
    expect(productLabel({ name: "Island Chimney Hood 90cm", brand: { name: "Siemens" } })).toBe(
      "Siemens Island Chimney Hood 90cm",
    );
  });

  it("does not double up the brand when the name already starts with it", () => {
    expect(productLabel({ name: "Faber Designer Chimney 90cm", brand: { name: "Faber" } })).toBe(
      "Faber Designer Chimney 90cm",
    );
  });

  it("matches case-insensitively", () => {
    expect(productLabel({ name: "faber Designer Chimney 90cm", brand: { name: "Faber" } })).toBe(
      "faber Designer Chimney 90cm",
    );
  });
});
