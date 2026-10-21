import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAndApply } from "@/lib/orders";
import { providerName, verifyWebhookSignature } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 64 * 1024;

/**
 * Paystack webhook.
 *  1. Signature: HMAC-SHA512(raw body, secret key) must match x-paystack-signature (timing-safe).
 *  2. Never trust the payload's amount/status: re-verify server-to-server with the Transactions API.
 *  3. Idempotent: duplicate deliveries are recorded once (unique eventKey) and order updates are
 *     guarded by conditional status transitions, so a replay can never double-fulfil.
 *  Always answers 200 for authenticated events we have handled (even duplicates) so Paystack stops retrying.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  if (!verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let evt: { event?: string; data?: { id?: number | string; reference?: string; status?: string } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const event = String(evt.event ?? "");
  const reference = evt.data?.reference ? String(evt.data.reference).slice(0, 100) : null;
  const eventKey = `${event}:${evt.data?.id ?? ""}:${reference ?? ""}`.slice(0, 200);

  if (event !== "charge.success" || !reference) {
    await recordOnce(eventKey, event, reference, "ignored");
    return NextResponse.json({ received: true });
  }

  // Duplicate delivery? Acknowledge without reprocessing.
  const seen = await db.webhookEvent.findUnique({ where: { eventKey } });
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    const { outcome } = await verifyAndApply(reference);
    await recordOnce(eventKey, event, reference, outcome);
    return NextResponse.json({ received: true, outcome });
  } catch (e) {
    console.error("[webhook] processing failed", reference, (e as Error).message);
    // 500 => Paystack retries later; nothing has been recorded, so the retry is processed normally.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function recordOnce(eventKey: string, event: string, reference: string | null, outcome: string) {
  await db.webhookEvent
    .create({ data: { provider: providerName(), eventKey, event, reference, outcome } })
    .catch(() => {
      /* unique violation = concurrent duplicate, already recorded */
    });
}
