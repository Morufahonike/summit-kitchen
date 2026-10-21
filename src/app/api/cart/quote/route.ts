import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteCart } from "@/lib/orders";
import { getSelectedCurrency } from "@/lib/currency";
import { convertUsdCents, formatMoney } from "@/lib/money";
import { isShippingMethod, shippingFor, FREE_SHIPPING_THRESHOLD_USD_CENTS } from "@/lib/shipping";
import { usdChargingEnabled } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

const bodySchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(20) })).max(50),
  shippingMethod: z.string().max(30).optional(),
  country: z.string().max(2).optional(),
});

export async function POST(req: Request) {
  if (!rateLimit(`quote:${await clientIp()}`, 120, 60_000).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });

  const currency = await getSelectedCurrency();
  const quote = await quoteCart(parsed.data.items, currency);

  let shipping: number | null = null;
  let shippingError: string | null = null;
  const { shippingMethod, country } = parsed.data;
  if (shippingMethod && country && isShippingMethod(shippingMethod)) {
    try {
      shipping = convertUsdCents(shippingFor(shippingMethod, quote.subtotalUsdCents, country), currency, quote.rate);
    } catch (e) {
      shippingError = (e as Error).message;
    }
  }
  const total = quote.subtotal + (shipping ?? 0);
  const chargeCurrency = currency === "USD" && usdChargingEnabled() ? "USD" : "NGN";
  const chargeTotal = chargeCurrency === currency ? total : null; // exact NGN charge is computed at order time

  return NextResponse.json(
    {
      currency,
      chargeCurrency,
      rate: quote.rate,
      lines: quote.lines.map((l) => ({ ...l, unitPriceFormatted: formatMoney(l.unitPrice, currency), lineTotalFormatted: formatMoney(l.lineTotal, currency) })),
      issues: quote.issues,
      subtotal: quote.subtotal,
      subtotalFormatted: formatMoney(quote.subtotal, currency),
      shipping,
      shippingFormatted: shipping === null ? null : shipping === 0 ? "Free" : formatMoney(shipping, currency),
      shippingError,
      total,
      totalFormatted: formatMoney(total, currency),
      chargeTotalFormatted: chargeTotal === null ? null : formatMoney(chargeTotal, chargeCurrency),
      freeShippingThresholdFormatted: formatMoney(convertUsdCents(FREE_SHIPPING_THRESHOLD_USD_CENTS, currency, quote.rate), currency),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
