// Pure money helpers. All amounts are integers in minor units (USD cents, NGN kobo).

export type CurrencyCode = "USD" | "NGN";
export const CURRENCIES: CurrencyCode[] = ["USD", "NGN"];

export function isCurrency(v: unknown): v is CurrencyCode {
  return v === "USD" || v === "NGN";
}

/**
 * Convert a USD price in cents to minor units of the target currency.
 * NGN is rounded to whole naira (multiples of 100 kobo) so displayed and charged prices match exactly.
 */
export function convertUsdCents(usdCents: number, to: CurrencyCode, usdNgnRate: number): number {
  if (!Number.isInteger(usdCents) || usdCents < 0) throw new Error("Invalid USD amount");
  if (to === "USD") return usdCents;
  if (!(usdNgnRate > 0)) throw new Error("Invalid exchange rate");
  const naira = Math.round((usdCents / 100) * usdNgnRate);
  return naira * 100;
}

export function formatMoney(minor: number, currency: CurrencyCode): string {
  const major = minor / 100;
  if (currency === "NGN") {
    return "₦" + major.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return "$" + major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Convert a major-unit amount typed by a shopper in the selected currency back to USD cents (for filters). */
export function toUsdCents(major: number, from: CurrencyCode, usdNgnRate: number): number {
  if (from === "USD") return Math.round(major * 100);
  return Math.round((major / usdNgnRate) * 100);
}
