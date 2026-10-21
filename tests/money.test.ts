import { describe, expect, it } from "vitest";
import { convertUsdCents, formatMoney, toUsdCents } from "../src/lib/money";
import { shippingFor } from "../src/lib/shipping";

describe("money", () => {
  it("keeps USD cents unchanged", () => {
    expect(convertUsdCents(18900, "USD", 1500)).toBe(18900);
  });
  it("converts to whole-naira kobo", () => {
    expect(convertUsdCents(18900, "NGN", 1532.47)).toBe(289637 * 100);
    expect(convertUsdCents(1, "NGN", 1500) % 100).toBe(0);
  });
  it("rejects bad input", () => {
    expect(() => convertUsdCents(-1, "NGN", 1500)).toThrow();
    expect(() => convertUsdCents(1.5, "USD", 1500)).toThrow();
    expect(() => convertUsdCents(100, "NGN", 0)).toThrow();
  });
  it("formats", () => {
    expect(formatMoney(18900, "USD")).toBe("$189.00");
    expect(formatMoney(28_350_000, "NGN")).toBe("₦283,500");
  });
  it("converts filter input back to USD cents", () => {
    expect(toUsdCents(150, "USD", 1500)).toBe(15000);
    expect(toUsdCents(150000, "NGN", 1500)).toBe(10000);
  });
});

describe("shipping", () => {
  it("free domestic shipping over threshold", () => {
    expect(shippingFor("LAGOS_STANDARD", 25000, "NG")).toBe(0);
    expect(shippingFor("LAGOS_STANDARD", 24999, "NG")).toBe(800);
  });
  it("international always charged", () => {
    expect(shippingFor("INTERNATIONAL", 999999, "GB")).toBe(4500);
  });
  it("rejects mismatched method/country", () => {
    expect(() => shippingFor("LAGOS_STANDARD", 100, "GB")).toThrow();
    expect(() => shippingFor("INTERNATIONAL", 100, "NG")).toThrow();
  });
});
