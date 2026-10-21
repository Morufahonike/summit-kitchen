import { notFound, redirect } from "next/navigation";
import { mockStore, providerName, signWebhook } from "@/lib/payments";
import { formatMoney } from "@/lib/money";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

/**
 * DEVELOPMENT-ONLY Paystack simulator. Unavailable unless PAYMENT_PROVIDER=mock (which is refused in production).
 * Sends webhooks in Paystack's exact format and HMAC-SHA512 signature so the real webhook handler is exercised.
 */
function mockEnabled() {
  try { return providerName() === "mock"; } catch { return false; }
}

async function simulate(formData: FormData) {
  "use server";
  if (!mockEnabled()) notFound();
  const reference = String(formData.get("reference") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const t = mockStore.get(reference);
  if (!t) notFound();

  if (outcome === "success" || outcome === "duplicate") {
    t.status = "success";
    t.paidAmount = t.input.amount;
  } else if (outcome === "wrong-amount") {
    t.status = "success";
    t.paidAmount = Math.max(100, Math.floor(t.input.amount / 2)); // underpayment
  } else if (outcome === "failed") {
    t.status = "failed";
  } else {
    t.status = "abandoned";
  }

  if (t.status === "success") {
    const body = JSON.stringify({
      event: "charge.success",
      data: { id: t.id, reference, status: "success", amount: t.paidAmount, currency: t.input.currency, channel: "card", authorization: { brand: "mastercard", last4: "1381" } },
    });
    const sends = outcome === "duplicate" ? 3 : 1;
    const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    await Promise.all(
      Array.from({ length: sends }, () =>
        fetch(`${base}/api/paystack/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": signWebhook(body) }, body }).catch(() => null),
      ),
    );
  }
  redirect(`/checkout/complete?reference=${encodeURIComponent(reference)}`);
}

export default async function MockPaystackPage({ params }: { params: Promise<{ reference: string }> }) {
  if (!mockEnabled()) notFound();
  const { reference } = await params;
  const t = mockStore.get(reference);
  if (!t) notFound();
  const options = [
    { v: "success", label: "Pay successfully (Mastercard •••• 1381)", cls: "btn-primary" },
    { v: "duplicate", label: "Pay + send webhook 3× (duplicate test)", cls: "btn-outline" },
    { v: "wrong-amount", label: "Pay WRONG amount (underpayment test)", cls: "btn-outline" },
    { v: "failed", label: "Card declined", cls: "btn-outline" },
    { v: "abandoned", label: "Cancel / abandon", cls: "btn-outline" },
  ];
  return (
    <div className="grid min-h-screen place-items-center bg-sand p-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 flex items-center justify-between">
          <Logo variant="horizontal" />
          <span className="rounded-full bg-danger/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-danger">Simulator</span>
        </div>
        <p className="text-xs text-muted">Development-only Paystack simulator. No real card is charged and no request leaves this machine.</p>
        <dl className="mt-6 space-y-2 rounded-xl bg-ivory p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="font-semibold">{formatMoney(t.input.amount, t.input.currency)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Email</dt><dd>{t.input.email}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Reference</dt><dd className="font-mono text-xs">{reference}</dd></div>
        </dl>
        <form action={simulate} className="mt-6 space-y-2.5">
          <input type="hidden" name="reference" value={reference} />
          {options.map((o) => (
            <button key={o.v} name="outcome" value={o.v} className={`${o.cls} w-full`}>{o.label}</button>
          ))}
        </form>
      </div>
    </div>
  );
}
