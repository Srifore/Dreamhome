import { phoneMatchKey } from "./phone";

describe("phoneMatchKey", () => {
  it("treats a +91-prefixed, spaced number and a bare 10-digit number as the same key", () => {
    expect(phoneMatchKey("+91 9900011122")).toBe(phoneMatchKey("9900011122"));
  });

  it("treats a country-code-prefixed number with no '+' the same as one with it", () => {
    expect(phoneMatchKey("919900011122")).toBe(phoneMatchKey("+919900011122"));
  });

  it("ignores punctuation like dashes and parentheses", () => {
    expect(phoneMatchKey("(990) 001-1122")).toBe("9900011122");
  });

  it("keeps only the last 10 digits for numbers with unusual country codes", () => {
    expect(phoneMatchKey("0044 9900011122")).toBe("9900011122");
  });
});
