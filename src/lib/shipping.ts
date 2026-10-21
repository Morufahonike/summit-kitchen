// PLACEHOLDER shipping rates (USD cents) — confirm with the business before launch.

export type ShippingMethod = "LAGOS_STANDARD" | "NIGERIA_STANDARD" | "INTERNATIONAL";

export const SHIPPING_METHODS: Record<ShippingMethod, { label: string; usdCents: number; eta: string }> = {
  LAGOS_STANDARD: { label: "Lagos delivery", usdCents: 800, eta: "1–3 business days" },
  NIGERIA_STANDARD: { label: "Nationwide (Nigeria)", usdCents: 1500, eta: "3–7 business days" },
  INTERNATIONAL: { label: "International courier", usdCents: 4500, eta: "7–14 business days" },
};

export const FREE_SHIPPING_THRESHOLD_USD_CENTS = 25000;

export function shippingFor(method: ShippingMethod, subtotalUsdCents: number, country: string): number {
  if (method !== "INTERNATIONAL" && country.trim().toUpperCase() !== "NG") {
    throw new Error("Domestic shipping is only available for Nigerian addresses");
  }
  if (method === "INTERNATIONAL" && country.trim().toUpperCase() === "NG") {
    throw new Error("Use a Nigerian delivery option for Nigerian addresses");
  }
  if (method !== "INTERNATIONAL" && subtotalUsdCents >= FREE_SHIPPING_THRESHOLD_USD_CENTS) return 0;
  return SHIPPING_METHODS[method].usdCents;
}

export function isShippingMethod(v: unknown): v is ShippingMethod {
  return typeof v === "string" && v in SHIPPING_METHODS;
}
