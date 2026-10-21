import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CurrencyCode } from "./money";

/**
 * Payment provider layer.
 *  - "paystack": real Paystack REST API (test keys only unless ALLOW_LIVE_PAYMENTS === "true")
 *  - "mock":     local Paystack simulator for development; identical webhook format and signing.
 *                Refused when NODE_ENV === "production".
 */

export type ProviderName = "paystack" | "mock";

export type InitInput = {
  reference: string;
  email: string;
  amount: number; // minor units
  currency: CurrencyCode;
  callbackUrl: string;
  metadata: Record<string, unknown>;
};

export type VerifyResult = {
  reference: string;
  status: "success" | "failed" | "abandoned" | "pending" | "reversed" | "unknown";
  amount: number;
  currency: string;
  channel?: string;
  cardBrand?: string;
  last4?: string;
  gatewayResponse?: string;
};

export class PaymentConfigError extends Error {}

export function providerName(): ProviderName {
  const p = (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase();
  if (p !== "paystack" && p !== "mock") throw new PaymentConfigError("PAYMENT_PROVIDER must be paystack or mock");
  if (p === "mock" && process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_IN_PRODUCTION !== "true") {
    throw new PaymentConfigError("Mock payments are disabled in production");
  }
  return p;
}

export function paymentMode(): "test" | "live" | "mock" {
  if (providerName() === "mock") return "mock";
  return secretKey().startsWith("sk_live_") ? "live" : "test";
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY ?? "";
  if (!key) throw new PaymentConfigError("PAYSTACK_SECRET_KEY is not set");
  if (key.startsWith("sk_live_") && process.env.ALLOW_LIVE_PAYMENTS !== "true") {
    throw new PaymentConfigError("Live Paystack key detected but ALLOW_LIVE_PAYMENTS is not enabled — refusing to charge");
  }
  return key;
}

export function usdChargingEnabled(): boolean {
  return process.env.PAYSTACK_USD_ENABLED === "true";
}

export function newPaymentReference(): string {
  return "SKP_" + randomBytes(10).toString("hex").toUpperCase();
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export function signWebhook(rawBody: string): string {
  return createHmac("sha512", secretKey()).update(rawBody).digest("hex");
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = Buffer.from(signWebhook(rawBody), "hex");
  const given = Buffer.from(signature, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// --------------------------------------------------------------------------------------------
// Paystack
// --------------------------------------------------------------------------------------------
const PAYSTACK_API = "https://api.paystack.co";

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(PAYSTACK_API + path, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !json.status || !json.data) {
    throw new Error(`Paystack ${path.split("?")[0]} failed: ${json.message ?? res.status}`);
  }
  return json.data;
}

// --------------------------------------------------------------------------------------------
// Mock simulator state (dev only, in-process)
// --------------------------------------------------------------------------------------------
type MockTxn = { input: InitInput; status: VerifyResult["status"]; paidAmount: number; id: number };
const g = globalThis as unknown as { __mockPaystack?: Map<string, MockTxn>; __mockId?: number };
export const mockStore: Map<string, MockTxn> = (g.__mockPaystack ??= new Map());
export function nextMockId() {
  g.__mockId = (g.__mockId ?? 1000) + 1;
  return g.__mockId;
}

// --------------------------------------------------------------------------------------------
export async function initializePayment(input: InitInput): Promise<{ authorizationUrl: string }> {
  if (providerName() === "mock") {
    mockStore.set(input.reference, { input, status: "pending", paidAmount: 0, id: nextMockId() });
    return { authorizationUrl: `/dev/paystack/${encodeURIComponent(input.reference)}` };
  }
  const data = await paystackFetch<{ authorization_url: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
      channels: ["card"],
    }),
  });
  if (data.reference !== input.reference) throw new Error("Paystack returned an unexpected reference");
  return { authorizationUrl: data.authorization_url };
}

export async function verifyPayment(reference: string): Promise<VerifyResult> {
  if (providerName() === "mock") {
    const t = mockStore.get(reference);
    if (!t) return { reference, status: "unknown", amount: 0, currency: "" };
    return {
      reference,
      status: t.status,
      amount: t.paidAmount,
      currency: t.input.currency,
      channel: "card",
      cardBrand: "mastercard",
      last4: "1381",
      gatewayResponse: t.status === "success" ? "Approved (mock)" : "Declined (mock)",
    };
  }
  const d = await paystackFetch<{
    reference: string;
    status: string;
    amount: number;
    currency: string;
    channel?: string;
    gateway_response?: string;
    authorization?: { brand?: string; card_type?: string; last4?: string };
  }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  const known = ["success", "failed", "abandoned", "pending", "reversed"] as const;
  return {
    reference: d.reference,
    status: (known as readonly string[]).includes(d.status) ? (d.status as VerifyResult["status"]) : "unknown",
    amount: d.amount,
    currency: d.currency,
    channel: d.channel,
    cardBrand: (d.authorization?.brand ?? d.authorization?.card_type)?.trim().toLowerCase(),
    last4: d.authorization?.last4,
    gatewayResponse: d.gateway_response,
  };
}
