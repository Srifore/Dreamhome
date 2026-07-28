import { describe, expect, it } from "vitest";
import { amountInWords } from "./number-to-words";

describe("amountInWords", () => {
  it("handles zero", () => {
    expect(amountInWords(0)).toBe("Indian Rupee Zero Only");
  });

  it("handles single digits", () => {
    expect(amountInWords(1)).toBe("Indian Rupee One Only");
    expect(amountInWords(5)).toBe("Indian Rupee Five Only");
    expect(amountInWords(9)).toBe("Indian Rupee Nine Only");
  });

  it("handles teens (11-19 irregular forms)", () => {
    expect(amountInWords(11)).toBe("Indian Rupee Eleven Only");
    expect(amountInWords(15)).toBe("Indian Rupee Fifteen Only");
    expect(amountInWords(19)).toBe("Indian Rupee Nineteen Only");
  });

  it("handles round tens without a trailing hyphen", () => {
    expect(amountInWords(20)).toBe("Indian Rupee Twenty Only");
    expect(amountInWords(90)).toBe("Indian Rupee Ninety Only");
  });

  it("hyphenates compound two-digit numbers", () => {
    expect(amountInWords(23)).toBe("Indian Rupee Twenty-Three Only");
    expect(amountInWords(99)).toBe("Indian Rupee Ninety-Nine Only");
  });

  it("handles round hundreds", () => {
    expect(amountInWords(300)).toBe("Indian Rupee Three Hundred Only");
  });

  it("handles hundreds combined with a compound remainder", () => {
    expect(amountInWords(502)).toBe("Indian Rupee Five Hundred Two Only");
    expect(amountInWords(678)).toBe("Indian Rupee Six Hundred Seventy-Eight Only");
  });

  it("handles round thousands", () => {
    expect(amountInWords(1000)).toBe("Indian Rupee One Thousand Only");
  });

  it("handles thousands + hundreds combined (documented example)", () => {
    // Documented in the source: 32502 -> "Thirty-Two Thousand Five Hundred Two"
    expect(amountInWords(32502)).toBe("Indian Rupee Thirty-Two Thousand Five Hundred Two Only");
  });

  it("handles round lakhs (Indian grouping, not Western million)", () => {
    expect(amountInWords(100000)).toBe("Indian Rupee One Lakh Only");
  });

  it("handles lakhs combined with thousands and hundreds", () => {
    // 2345678 -> 23 lakh, 45 thousand, 678
    expect(amountInWords(2345678)).toBe(
      "Indian Rupee Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight Only",
    );
  });

  it("handles round crores (Indian grouping, not Western billion)", () => {
    expect(amountInWords(10000000)).toBe("Indian Rupee One Crore Only");
  });

  it("handles all groups combined: crore + lakh + thousand + hundred", () => {
    expect(amountInWords(12345678)).toBe(
      "Indian Rupee One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight Only",
    );
  });

  it("handles a large multi-crore amount", () => {
    // 123456789 -> 12 crore, 34 lakh, 56 thousand, 789
    expect(amountInWords(123456789)).toBe(
      "Indian Rupee Twelve Crore Thirty-Four Lakh Fifty-Six Thousand Seven Hundred Eighty-Nine Only",
    );
  });

  it("appends paise when the amount has a fractional (rupee.paise) part", () => {
    expect(amountInWords(1234.56)).toBe("Indian Rupee One Thousand Two Hundred Thirty-Four and Fifty-Six Paise Only");
  });

  it("omits the paise clause entirely when the fractional part is zero", () => {
    expect(amountInWords(500.0)).toBe("Indian Rupee Five Hundred Only");
  });

  it("rounds paise to the nearest whole paisa", () => {
    expect(amountInWords(100.5)).toBe("Indian Rupee One Hundred and Fifty Paise Only");
  });

  it("documents the floating-point edge case where rounding produces 100 paise", () => {
    // Math.round((0.999 - 0) * 100) === 100, so this does NOT carry over into an extra rupee —
    // it renders as "One Hundred Paise" rather than rolling to "1 rupee, 0 paise". Captured here
    // as a regression guard on the function's actual (not idealized) behavior.
    expect(amountInWords(0.999)).toBe("Indian Rupee Zero and One Hundred Paise Only");
  });

  it("uses the absolute value for negative amounts (no negative sign/word)", () => {
    expect(amountInWords(-500)).toBe("Indian Rupee Five Hundred Only");
  });
});
