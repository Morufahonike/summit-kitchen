"use server";

import { db } from "@/lib/db";
import { CUSTOMER_STATUS_LABEL } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export type TrackResult =
  | { state: "idle" }
  | { state: "error"; message: string }
  | {
      state: "found";
      order: {
        number: string;
        status: string;
        statusKey: string;
        placed: string;
        total: string;
        shippingMethod: string;
        city: string;
        tracking: string | null;
        items: { name: string; quantity: number }[];
        events: { status: string; message: string; at: string }[];
      };
    };

export async function trackOrderAction(_prev: TrackResult, formData: FormData): Promise<TrackResult> {
  if (!rateLimit(`track:${await clientIp()}`, 15, 10 * 60_000).ok) {
    return { state: "error", message: "Too many lookups. Please wait a few minutes." };
  }
  const number = String(formData.get("order") ?? "").trim().toUpperCase().slice(0, 30);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const generic = { state: "error" as const, message: "We couldn't find an order with that number and email." };
  if (!/^SK-\d{6}-[A-Z0-9]{6}$/.test(number) || !email.includes("@")) return generic;

  const o = await db.order.findUnique({
    where: { number },
    include: { items: { select: { name: true, quantity: true } }, events: { where: { internal: false }, orderBy: { createdAt: "asc" } } },
  });
  // same message whether the number or the email is wrong — does not reveal which orders exist
  if (!o || o.email !== email) return generic;

  return {
    state: "found",
    order: {
      number: o.number,
      status: CUSTOMER_STATUS_LABEL[o.status],
      statusKey: o.status,
      placed: o.createdAt.toISOString(),
      total: formatMoney(o.total, o.currency),
      shippingMethod: o.shippingMethod,
      city: `${o.shipCity}, ${o.shipCountry}`,
      tracking: o.trackingNumber ? `${o.trackingCarrier ?? "Carrier"} · ${o.trackingNumber}` : null,
      items: o.items,
      events: o.events.map((e) => ({ status: CUSTOMER_STATUS_LABEL[e.status], message: e.message, at: e.createdAt.toISOString() })),
    },
  };
}
