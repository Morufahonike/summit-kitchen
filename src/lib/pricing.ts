import "server-only";
import { cache } from "react";
import { getSelectedCurrency } from "./currency";
import { getUsdNgnRate } from "./fx";
import { convertUsdCents, formatMoney, type CurrencyCode } from "./money";

export type Pricing = {
  currency: CurrencyCode;
  rate: number;
  rateSource: string;
  rateStale: boolean;
  rateAt: Date;
  price: (usdCents: number) => string;
  convert: (usdCents: number) => number;
};

/** Currency + rate for this request; every price on the page uses the same rate. */
export const getPricing = cache(async (): Promise<Pricing> => {
  const [currency, fx] = await Promise.all([getSelectedCurrency(), getUsdNgnRate()]);
  const convert = (c: number) => convertUsdCents(c, currency, fx.rate);
  return {
    currency,
    rate: fx.rate,
    rateSource: fx.source,
    rateStale: fx.stale,
    rateAt: fx.fetchedAt,
    convert,
    price: (c: number) => formatMoney(convert(c), currency),
  };
});
