import { beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { newPaymentReference, paymentMode, providerName, usdChargingEnabled, verifyWebhookSignature } from "../src/lib/payments";

const env = process.env as Record<string, string | undefined>;
beforeEach(() => {
  env.NODE_ENV = "development";
  env.PAYMENT_PROVIDER = "mock";
  env.PAYSTACK_SECRET_KEY = "sk_test_abc";
  env.ALLOW_LIVE_PAYMENTS = "false";
  delete env.ALLOW_MOCK_IN_PRODUCTION;
  delete env.PAYSTACK_USD_ENABLED;
});

describe("webhook signature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "SKP_X" } });
  const sig = (key: string, b = body) => createHmac("sha512", key).update(b).digest("hex");
  it("accepts a correct Paystack signature", () => expect(verifyWebhookSignature(body, sig("sk_test_abc"))).toBe(true));
  it("rejects a tampered body", () => expect(verifyWebhookSignature(body.replace("X", "Y"), sig("sk_test_abc"))).toBe(false));
  it("rejects a signature from another key", () => expect(verifyWebhookSignature(body, sig("sk_test_other"))).toBe(false));
  it("rejects missing / malformed signature", () => {
    expect(verifyWebhookSignature(body, null)).toBe(false);
    expect(verifyWebhookSignature(body, "abc")).toBe(false);
  });
});

describe("payment safety guards", () => {
  it("refuses live keys unless ALLOW_LIVE_PAYMENTS=true", () => {
    env.PAYMENT_PROVIDER = "paystack";
    env.PAYSTACK_SECRET_KEY = "sk_live_x";
    expect(() => paymentMode()).toThrow();
    env.ALLOW_LIVE_PAYMENTS = "true";
    expect(paymentMode()).toBe("live");
  });
  it("test key => test mode", () => {
    env.PAYMENT_PROVIDER = "paystack";
    expect(paymentMode()).toBe("test");
  });
  it("simulator refused in production", () => {
    env.NODE_ENV = "production";
    expect(() => providerName()).toThrow();
  });
  it("USD charging off by default", () => expect(usdChargingEnabled()).toBe(false));
  it("references are unique and well-formed", () => {
    const a = newPaymentReference();
    expect(a).not.toBe(newPaymentReference());
    expect(/^SKP_[0-9A-F]{20}$/.test(a)).toBe(true);
  });
});
