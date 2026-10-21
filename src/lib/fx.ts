import "server-only";
import { db } from "./db";

export type FxQuote = { rate: number; source: string; fetchedAt: Date; isManual: boolean; stale: boolean };

const CACHE_HOURS = Number(process.env.FX_CACHE_HOURS ?? 6);

/**
 * USD -> NGN rate.
 * Priority: admin manual override (latest) > cached provider rate (< FX_CACHE_HOURS old)
 * > fresh provider fetch > last stored rate (marked stale) > FX_FALLBACK_USD_NGN env (marked stale).
 */
export async function getUsdNgnRate(): Promise<FxQuote> {
  const manual = await db.exchangeRate.findFirst({
    where: { base: "USD", quote: "NGN", isManual: true },
    orderBy: { fetchedAt: "desc" },
  });
  if (manual) {
    return { rate: Number(manual.rate), source: manual.source, fetchedAt: manual.fetchedAt, isManual: true, stale: false };
  }

  const latest = await db.exchangeRate.findFirst({
    where: { base: "USD", quote: "NGN", isManual: false },
    orderBy: { fetchedAt: "desc" },
  });
  const fresh = latest && Date.now() - latest.fetchedAt.getTime() < CACHE_HOURS * 3600_000;
  if (latest && fresh) {
    return { rate: Number(latest.rate), source: latest.source, fetchedAt: latest.fetchedAt, isManual: false, stale: false };
  }

  const fetched = await fetchProviderRate();
  if (fetched) {
    const row = await db.exchangeRate.create({
      data: { base: "USD", quote: "NGN", rate: fetched.rate, source: fetched.source },
    });
    return { rate: fetched.rate, source: fetched.source, fetchedAt: row.fetchedAt, isManual: false, stale: false };
  }

  if (latest) {
    return { rate: Number(latest.rate), source: latest.source, fetchedAt: latest.fetchedAt, isManual: false, stale: true };
  }
  const fallback = Number(process.env.FX_FALLBACK_USD_NGN ?? 0);
  if (!(fallback > 0)) throw new Error("No exchange rate available");
  return { rate: fallback, source: "fallback (env)", fetchedAt: new Date(0), isManual: false, stale: true };
}

async function fetchProviderRate(): Promise<{ rate: number; source: string } | null> {
  const url = process.env.FX_PROVIDER_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: Record<string, number> };
    const rate = json.rates?.NGN;
    // sanity bounds guard against a broken feed silently mispricing the store
    if (typeof rate !== "number" || !(rate > 100 && rate < 100000)) return null;
    return { rate: Math.round(rate * 10000) / 10000, source: new URL(url).host };
  } catch {
    return null;
  }
}
