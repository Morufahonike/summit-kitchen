import "server-only";
import { cookies } from "next/headers";
import { isCurrency, type CurrencyCode } from "./money";

export const CURRENCY_COOKIE = "sk_currency";

export async function getSelectedCurrency(): Promise<CurrencyCode> {
  const v = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return isCurrency(v) ? v : "USD";
}
