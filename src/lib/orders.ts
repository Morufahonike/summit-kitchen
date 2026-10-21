import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma, type OrderStatus } from "@prisma/client";
import { db } from "./db";
import { convertUsdCents, type CurrencyCode } from "./money";
import { shippingFor, SHIPPING_METHODS, type ShippingMethod } from "./shipping";
import { getUsdNgnRate } from "./fx";
import {
  initializePayment,
  newPaymentReference,
  providerName,
  usdChargingEnabled,
  verifyPayment,
  type VerifyResult,
} from "./payments";

type Tx = Prisma.TransactionClient;

export type CartLineInput = { productId: string; quantity: number };

export type QuotedLine = {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  isSample: boolean;
  quantity: number;
  available: number;
  unitPrice: number;
  lineTotal: number;
  unitPriceUsdCents: number;
};

export type Quote = {
  currency: CurrencyCode;
  rate: number;
  rateSource: string;
  lines: QuotedLine[];
  subtotal: number;
  subtotalUsdCents: number;
  issues: string[];
};

/** Prices a cart from the database. Client-supplied prices are never trusted. */
export async function quoteCart(items: CartLineInput[], currency: CurrencyCode): Promise<Quote> {
  const merged = mergeLines(items);
  const fx = await getUsdNgnRate();
  const products = await db.product.findMany({
    where: { id: { in: merged.map((i) => i.productId) } },
    select: { id: true, slug: true, name: true, sku: true, images: true, isSample: true, priceUsdCents: true, stock: true, isActive: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const issues: string[] = [];
  const lines: QuotedLine[] = [];
  for (const it of merged) {
    const p = byId.get(it.productId);
    if (!p || !p.isActive) {
      issues.push("An item in your cart is no longer available and was removed.");
      continue;
    }
    let qty = it.quantity;
    if (p.stock <= 0) {
      issues.push(`${p.name} is out of stock.`);
      continue;
    }
    if (qty > p.stock) {
      issues.push(`Only ${p.stock} × ${p.name} available — quantity adjusted.`);
      qty = p.stock;
    }
    const unit = convertUsdCents(p.priceUsdCents, currency, fx.rate);
    lines.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      sku: p.sku,
      image: p.images[0] ?? null,
      isSample: p.isSample,
      quantity: qty,
      available: p.stock,
      unitPrice: unit,
      lineTotal: unit * qty,
      unitPriceUsdCents: p.priceUsdCents,
    });
  }
  return {
    currency,
    rate: fx.rate,
    rateSource: fx.source,
    lines,
    subtotal: lines.reduce((s, l) => s + l.lineTotal, 0),
    subtotalUsdCents: lines.reduce((s, l) => s + l.unitPriceUsdCents * l.quantity, 0),
    issues,
  };
}

function mergeLines(items: CartLineInput[]): CartLineInput[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i.productId, Math.min(20, (m.get(i.productId) ?? 0) + i.quantity));
  return [...m].map(([productId, quantity]) => ({ productId, quantity }));
}

function newOrderNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let s = "";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `SK-${ymd}-${s}`;
}

export type CheckoutInput = {
  email: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  shippingMethod: ShippingMethod;
  notes?: string;
  items: CartLineInput[];
};

export class CheckoutError extends Error {}

/**
 * Creates the order, reserves stock atomically and initialises the payment.
 * Returns the URL to send the shopper to.
 */
export async function placeOrder(input: CheckoutInput, displayCurrency: CurrencyCode, userId: string | null, appUrl: string) {
  // USD charging requires Paystack USD enablement; otherwise the NGN equivalent is charged.
  const chargeCurrency: CurrencyCode = displayCurrency === "USD" && usdChargingEnabled() ? "USD" : "NGN";
  const fx = await getUsdNgnRate();
  const merged = mergeLines(input.items);
  const reference = newPaymentReference();

  const order = await db.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: merged.map((m) => m.productId) }, isActive: true } });
    const byId = new Map(products.map((p) => [p.id, p]));
    let subtotalUsd = 0;
    let subtotal = 0;
    const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const line of merged) {
      const p = byId.get(line.productId);
      if (!p) throw new CheckoutError("An item in your cart is no longer available. Please review your cart.");
      // conditional decrement = atomic reservation; fails if another order took the stock first
      const res = await tx.product.updateMany({
        where: { id: p.id, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (res.count !== 1) throw new CheckoutError(`Not enough stock for ${p.name}. Please update your cart.`);
      const unit = convertUsdCents(p.priceUsdCents, chargeCurrency, fx.rate);
      subtotalUsd += p.priceUsdCents * line.quantity;
      subtotal += unit * line.quantity;
      items.push({ product: { connect: { id: p.id } }, name: p.name, sku: p.sku, unitPrice: unit, quantity: line.quantity, lineTotal: unit * line.quantity });
    }

    let shippingUsd: number;
    try {
      shippingUsd = shippingFor(input.shippingMethod, subtotalUsd, input.country);
    } catch (e) {
      throw new CheckoutError((e as Error).message);
    }
    const shippingFee = convertUsdCents(shippingUsd, chargeCurrency, fx.rate);
    const total = subtotal + shippingFee;

    const created = await tx.order.create({
      data: {
        number: newOrderNumber(),
        userId,
        email: input.email,
        displayCurrency,
        currency: chargeCurrency,
        exchangeRate: new Prisma.Decimal(fx.rate),
        subtotal,
        shippingFee,
        total,
        shippingMethod: SHIPPING_METHODS[input.shippingMethod].label,
        shipFullName: input.fullName,
        shipPhone: input.phone,
        shipLine1: input.line1,
        shipLine2: input.line2 || null,
        shipCity: input.city,
        shipState: input.state,
        shipPostalCode: input.postalCode || null,
        shipCountry: input.country,
        notes: input.notes || null,
        items: { create: items },
        events: { create: { status: "PENDING_PAYMENT", message: "Order placed — awaiting payment" } },
        payments: { create: { provider: providerName(), reference, amount: total, currency: chargeCurrency } },
      },
      include: { items: true },
    });

    await tx.inventoryMovement.createMany({
      data: created.items.map((i) => ({ productId: i.productId, change: -i.quantity, reason: "Reserved for order", orderId: created.id })),
    });
    return created;
  });

  try {
    const { authorizationUrl } = await initializePayment({
      reference,
      email: input.email,
      amount: order.total,
      currency: order.currency,
      callbackUrl: `${appUrl}/checkout/complete`,
      metadata: { orderNumber: order.number, orderId: order.id },
    });
    return { order, reference, authorizationUrl };
  } catch (e) {
    // payment could not start: release the reservation so stock is not stuck
    await db.$transaction(async (tx) => {
      await tx.payment.update({ where: { reference }, data: { status: "FAILED", failureReason: "Initialisation failed" } });
      await setStatus(tx, order.id, ["PENDING_PAYMENT"], "PAYMENT_FAILED", "Payment could not be started");
      await releaseStock(tx, order.id, "Payment initialisation failed");
    });
    throw new CheckoutError("We couldn't start the payment. Please try again in a moment.");
  }
}

async function setStatus(tx: Tx, orderId: string, from: OrderStatus[], to: OrderStatus, message: string, internal = false) {
  const r = await tx.order.updateMany({
    where: { id: orderId, status: { in: from } },
    data: { status: to, ...(to === "PAID" ? { paidAt: new Date() } : {}) },
  });
  if (r.count === 1) await tx.orderEvent.create({ data: { orderId, status: to, message, internal } });
  return r.count === 1;
}

/** Returns reserved stock exactly once per order. */
export async function releaseStock(tx: Tx, orderId: string, reason: string) {
  const flag = await tx.order.updateMany({ where: { id: orderId, stockReleased: false }, data: { stockReleased: true } });
  if (flag.count !== 1) return false;
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const i of items) {
    await tx.product.update({ where: { id: i.productId }, data: { stock: { increment: i.quantity } } });
  }
  await tx.inventoryMovement.createMany({
    data: items.map((i) => ({ productId: i.productId, change: i.quantity, reason, orderId })),
  });
  return true;
}

export type ApplyOutcome =
  | "paid"
  | "already_processed"
  | "amount_mismatch"
  | "paid_after_expiry"
  | "failed"
  | "pending"
  | "unknown_reference";

/**
 * Single place where a verified provider result changes an order.
 * Safe to call any number of times, concurrently, from the webhook and the redirect callback.
 */
export async function applyPaymentResult(v: VerifyResult): Promise<ApplyOutcome> {
  return db.$transaction(
    async (tx) => {
      const payment = await tx.payment.findUnique({ where: { reference: v.reference }, include: { order: true } });
      if (!payment) return "unknown_reference";
      if (payment.status === "SUCCESS" || payment.status === "MISMATCH") return "already_processed";

      if (v.status === "success") {
        const amountOk = v.amount === payment.amount && v.currency.toUpperCase() === payment.currency;
        // the conditional update is the idempotency lock: only one concurrent caller wins
        const claim = await tx.payment.updateMany({
          where: { id: payment.id, status: { in: ["INITIALIZED", "FAILED", "ABANDONED"] } },
          data: {
            status: amountOk ? "SUCCESS" : "MISMATCH",
            paidAmount: v.amount,
            paidCurrency: v.currency,
            channel: v.channel,
            cardBrand: v.cardBrand,
            last4: v.last4,
            failureReason: amountOk ? null : `Expected ${payment.amount} ${payment.currency}, received ${v.amount} ${v.currency}`,
          },
        });
        if (claim.count !== 1) return "already_processed";

        if (!amountOk) {
          await tx.order.update({ where: { id: payment.orderId }, data: { status: "NEEDS_REVIEW" } });
          await tx.orderEvent.create({
            data: {
              orderId: payment.orderId,
              status: "NEEDS_REVIEW",
              message: `Payment amount mismatch: expected ${payment.amount} ${payment.currency}, received ${v.amount} ${v.currency}. Not fulfilled.`,
              internal: true,
            },
          });
          return "amount_mismatch";
        }

        const paid = await setStatus(tx, payment.orderId, ["PENDING_PAYMENT", "PAYMENT_FAILED"], "PAID", "Payment confirmed");
        if (paid) {
          // a previously failed attempt may have released the stock — re-reserve it
          if (payment.order.stockReleased) {
            const ok = await reReserve(tx, payment.orderId);
            if (!ok) {
              await tx.order.update({ where: { id: payment.orderId }, data: { status: "NEEDS_REVIEW" } });
              await tx.orderEvent.create({ data: { orderId: payment.orderId, status: "NEEDS_REVIEW", message: "Paid, but stock is no longer available — contact customer.", internal: true } });
              return "paid_after_expiry";
            }
          }
          return "paid";
        }
        // order was EXPIRED / CANCELLED when money arrived
        await tx.order.update({ where: { id: payment.orderId }, data: { status: "NEEDS_REVIEW", paidAt: new Date() } });
        await tx.orderEvent.create({
          data: { orderId: payment.orderId, status: "NEEDS_REVIEW", message: `Payment received after order was ${payment.order.status}. Review stock / refund.`, internal: true },
        });
        return "paid_after_expiry";
      }

      if (v.status === "failed" || v.status === "abandoned" || v.status === "reversed") {
        const r = await tx.payment.updateMany({
          where: { id: payment.id, status: "INITIALIZED" },
          data: { status: v.status === "abandoned" ? "ABANDONED" : "FAILED", failureReason: v.gatewayResponse ?? v.status },
        });
        if (r.count !== 1) return "already_processed";
        await setStatus(tx, payment.orderId, ["PENDING_PAYMENT"], "PAYMENT_FAILED", "Payment was not completed");
        await releaseStock(tx, payment.orderId, "Payment failed");
        return "failed";
      }
      return "pending";
    },
    // READ COMMITTED + conditional updates: a concurrent duplicate blocks on the row lock,
    // then re-evaluates the WHERE clause and matches 0 rows, so it can never double-apply.
    { timeout: 15000 },
  );
}

async function reReserve(tx: Tx, orderId: string): Promise<boolean> {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const i of items) {
    const r = await tx.product.updateMany({ where: { id: i.productId, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
    if (r.count !== 1) return false;
  }
  await tx.order.update({ where: { id: orderId }, data: { stockReleased: false } });
  await tx.inventoryMovement.createMany({ data: items.map((i) => ({ productId: i.productId, change: -i.quantity, reason: "Re-reserved after late payment", orderId })) });
  return true;
}

/** Verify with the provider (server-to-server) and apply. Used by the redirect callback. */
export async function verifyAndApply(reference: string) {
  const v = await verifyPayment(reference);
  if (v.status === "unknown") return { outcome: "unknown_reference" as const, verify: v };
  return { outcome: await applyPaymentResult(v), verify: v };
}

const EXPIRE_MINUTES = 60;

/**
 * Expires unpaid orders older than EXPIRE_MINUTES and releases their stock.
 * Each one is re-verified with the provider first, so a lost webhook never expires a paid order.
 */
export async function expireStaleOrders(): Promise<number> {
  const cutoff = new Date(Date.now() - EXPIRE_MINUTES * 60_000);
  const stale = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    take: 50,
  });
  let n = 0;
  for (const o of stale) {
    const ref = o.payments[0]?.reference;
    if (ref) {
      try {
        const { outcome } = await verifyAndApply(ref);
        if (outcome === "paid" || outcome === "amount_mismatch" || outcome === "failed") continue;
      } catch {
        continue; // provider unreachable — try again later rather than expiring blindly
      }
    }
    const done = await db.$transaction(async (tx) => {
      const ok = await setStatus(tx, o.id, ["PENDING_PAYMENT"], "EXPIRED", "Payment window expired");
      if (ok) {
        await releaseStock(tx, o.id, "Order expired");
        if (ref) await tx.payment.updateMany({ where: { reference: ref, status: "INITIALIZED" }, data: { status: "ABANDONED" } });
      }
      return ok;
    });
    if (done) n++;
  }
  return n;
}

export const CUSTOMER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Payment confirmed",
  PROCESSING: "Being prepared",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  PAYMENT_FAILED: "Payment unsuccessful",
  EXPIRED: "Expired (not paid)",
  NEEDS_REVIEW: "Under review",
};

/** Transitions an admin may make, keyed by current status. */
export const ADMIN_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  NEEDS_REVIEW: ["PROCESSING", "CANCELLED"],
  PENDING_PAYMENT: ["CANCELLED"],
};
