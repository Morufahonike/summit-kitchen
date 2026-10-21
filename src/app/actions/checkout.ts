"use server";

import { getCurrentUser } from "@/lib/auth";
import { getSelectedCurrency } from "@/lib/currency";
import { COUNTRY_CODES } from "@/lib/countries";
import { CheckoutError, placeOrder, expireStaleOrders } from "@/lib/orders";
import { PaymentConfigError } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { checkoutSchema, fieldErrors } from "@/lib/validation";

export type CheckoutState = { ok: false; error?: string; fields?: Record<string, string> } | { ok: true; redirectUrl: string; orderNumber: string };

export async function placeOrderAction(input: unknown): Promise<CheckoutState> {
  const ip = await clientIp();
  if (!rateLimit(`checkout:${ip}`, 10, 10 * 60_000).ok) {
    return { ok: false, error: "Too many checkout attempts. Please wait a few minutes and try again." };
  }
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
  if (!COUNTRY_CODES.has(parsed.data.country)) return { ok: false, fields: { country: "We don't ship to this country yet" } };

  const [user, currency] = await Promise.all([getCurrentUser(), getSelectedCurrency()]);
  // housekeeping: free up stock held by abandoned checkouts before reserving more
  await expireStaleOrders().catch(() => 0);

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  try {
    const { order, authorizationUrl } = await placeOrder(
      { ...parsed.data, line2: parsed.data.line2 || undefined, postalCode: parsed.data.postalCode || undefined, notes: parsed.data.notes || undefined },
      currency,
      user?.id ?? null,
      appUrl,
    );
    return { ok: true, redirectUrl: authorizationUrl, orderNumber: order.number };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    if (e instanceof PaymentConfigError) {
      console.error("[checkout] payment configuration:", e.message);
      return { ok: false, error: "Payments are temporarily unavailable. Please try again later." };
    }
    console.error("[checkout] unexpected error", e);
    return { ok: false, error: "Something went wrong placing your order. You have not been charged." };
  }
}
