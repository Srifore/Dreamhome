import { describe, expect, it } from "vitest";
import { getQuoteTemplateStyle, QUOTE_TEMPLATES } from "./quote-templates";

const KNOWN_IDS = ["standard", "modern", "simple", "classic", "compact"];

describe("QUOTE_TEMPLATES", () => {
  it("lists exactly the 5 known template ids", () => {
    expect(QUOTE_TEMPLATES.map((t) => t.id).sort()).toEqual([...KNOWN_IDS].sort());
  });
});

describe("getQuoteTemplateStyle", () => {
  it("returns a distinct style object for each of the 5 template ids", () => {
    const styles = KNOWN_IDS.map((id) => getQuoteTemplateStyle(id));
    const serialized = styles.map((s) => JSON.stringify(s));
    expect(new Set(serialized).size).toBe(KNOWN_IDS.length);
  });

  it("falls back to the standard (BASE) style for an unrecognized id", () => {
    const standard = getQuoteTemplateStyle("standard");
    const unknown = getQuoteTemplateStyle("does-not-exist");
    expect(unknown).toEqual(standard);
  });

  it("falls back to the standard style for an empty string id", () => {
    expect(getQuoteTemplateStyle("")).toEqual(getQuoteTemplateStyle("standard"));
  });

  it("only the modern template enables a full-bleed header band", () => {
    for (const id of KNOWN_IDS) {
      const style = getQuoteTemplateStyle(id);
      expect(style.headerBand).toBe(id === "modern");
    }
  });

  it("only the classic template centers the header", () => {
    for (const id of KNOWN_IDS) {
      const style = getQuoteTemplateStyle(id);
      expect(style.headerAlign).toBe(id === "classic" ? "center" : "left");
    }
  });

  it("standard template matches the documented BASE defaults", () => {
    const standard = getQuoteTemplateStyle("standard");
    expect(standard.headerBand).toBe(false);
    expect(standard.headerAlign).toBe("left");
    expect(standard.tableBorderClass).toBe("border-b border-neutral-100 last:border-0");
  });
});
