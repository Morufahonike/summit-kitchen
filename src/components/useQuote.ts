"use client";

import { useEffect, useState } from "react";
import type { CartItem } from "./CartProvider";

export type QuoteLine = {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  isSample: boolean;
  quantity: number;
  available: number;
  unitPriceFormatted: string;
  lineTotalFormatted: string;
};

export type QuoteResponse = {
  currency: "USD" | "NGN";
  chargeCurrency: "USD" | "NGN";
  rate: number;
  lines: QuoteLine[];
  issues: string[];
  subtotalFormatted: string;
  shipping: number | null;
  shippingFormatted: string | null;
  shippingError: string | null;
  totalFormatted: string;
  freeShippingThresholdFormatted: string;
};

export function useQuote(items: CartItem[], ready: boolean, shipping?: { method: string; country: string }) {
  const [data, setData] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify([items, shipping]);

  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    setLoading(true);
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, shippingMethod: shipping?.method, country: shipping?.country }),
      signal: ctl.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Could not load prices");
        return r.json();
      })
      .then((d: QuoteResponse) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => setLoading(false));
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return { data, error, loading };
}
