"use server";

import { cookies } from "next/headers";
import { CURRENCY_COOKIE } from "@/lib/currency";
import { isCurrency } from "@/lib/money";

export async function setCurrencyAction(currency: string) {
  if (!isCurrency(currency)) return;
  (await cookies()).set(CURRENCY_COOKIE, currency, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}
