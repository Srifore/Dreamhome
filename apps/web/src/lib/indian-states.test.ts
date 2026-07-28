import { describe, expect, it } from "vitest";
import { INDIAN_STATES, stateWithCode } from "./indian-states";

describe("INDIAN_STATES", () => {
  it("contains all 37 GST state/UT entries (code 28 is intentionally absent)", () => {
    expect(INDIAN_STATES).toHaveLength(37);
  });

  it("has a unique code for every entry", () => {
    const codes = INDIAN_STATES.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("has a unique, non-empty name for every entry", () => {
    const names = INDIAN_STATES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });

  it("uses zero-padded two-digit numeric codes", () => {
    for (const state of INDIAN_STATES) {
      expect(state.code).toMatch(/^\d{2}$/);
    }
  });
});

describe("stateWithCode", () => {
  it("formats a known state as 'Name (Code)'", () => {
    expect(stateWithCode("Karnataka")).toBe("Karnataka (29)");
    expect(stateWithCode("Delhi")).toBe("Delhi (07)");
  });

  it("is case-insensitive and trims whitespace when matching", () => {
    expect(stateWithCode("  karnataka  ")).toBe("Karnataka (29)");
    expect(stateWithCode("TAMIL NADU")).toBe("Tamil Nadu (33)");
  });

  it("returns the original string unchanged when the state is not recognized", () => {
    expect(stateWithCode("Atlantis")).toBe("Atlantis");
  });

  it("returns an empty string for null/undefined/empty input", () => {
    expect(stateWithCode(null)).toBe("");
    expect(stateWithCode(undefined)).toBe("");
    expect(stateWithCode("")).toBe("");
  });
});
