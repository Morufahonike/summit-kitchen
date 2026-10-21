import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { verifyAndApply } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { Icon } from "@/components/Icon";
import { ClearCart } from "./ClearCart";

export const metadata: Metadata = { title: "Order status" };
export const dynamic = "force-dynamic";

export default async function CompletePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const raw = sp.reference ?? sp.trxref;
  const reference = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(reference)) return <Message title="We couldn't find that payment" body="The payment reference is missing or invalid." />;

  // Server-to-server verification — the redirect itself proves nothing.
  try {
    await verifyAndApply(reference);
  } catch (e) {
    console.error("[complete] verify failed", (e as Error).message);
  }
  const payment = await db.payment.findUnique({
    where: { reference },
    include: { order: { include: { items: true } } },
  });
  if (!payment) return <Message title="We couldn't find that payment" body="If you were charged, please contact us with your bank reference." />;
  const o = payment.order;

  if (o.status === "PAID" || o.status === "PROCESSING") {
    return (
      <div className="container-x max-w-2xl py-16 text-center">
        <ClearCart />
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-olive/10 text-olive"><Icon name="check" className="h-8 w-8" strokeWidth={2} /></span>
        <h1 className="mt-6 font-display text-4xl">Thank you for your order</h1>
        <p className="mt-3 text-muted">Payment confirmed. A summary is below — keep your order number to track delivery.</p>
        <div className="card mt-8 p-6 text-left">
          <div className="flex justify-between text-sm"><span className="text-muted">Order number</span><span className="font-semibold">{o.number}</span></div>
          <div className="mt-2 flex justify-between text-sm"><span className="text-muted">Amount paid</span><span className="font-semibold">{formatMoney(o.total, o.currency)}</span></div>
          <ul className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            {o.items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.quantity} × {i.name}</span><span>{formatMoney(i.lineTotal, o.currency)}</span></li>)}
          </ul>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/track?order=${o.number}`} className="btn-primary">Track this order</Link>
          <Link href="/shop" className="btn-outline">Continue shopping</Link>
        </div>
      </div>
    );
  }
  if (o.status === "PENDING_PAYMENT") {
    return <Message title="Payment pending" body={`We haven't received confirmation for order ${o.number} yet. This page will update once Paystack confirms — you can refresh in a moment.`} retry={reference} />;
  }
  if (o.status === "NEEDS_REVIEW") {
    return <Message title="We're checking your payment" body={`Order ${o.number} needs a quick manual review. Our team will contact you at ${o.email}. Please don't pay again.`} />;
  }
  return (
    <Message
      title="Payment not completed"
      body={`Payment for order ${o.number} was not successful, so you have not been charged. Your cart has been kept — you can try again.`}
      cta={{ href: "/cart", label: "Return to cart" }}
    />
  );
}

function Message({ title, body, cta, retry }: { title: string; body: string; cta?: { href: string; label: string }; retry?: string }) {
  return (
    <div className="container-x max-w-xl py-20 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gold/15 text-[#8a6624]"><Icon name="alert" className="h-7 w-7" /></span>
      <h1 className="mt-6 font-display text-3xl">{title}</h1>
      <p className="mt-3 text-muted">{body}</p>
      <div className="mt-8 flex justify-center gap-3">
        {retry && <Link href={`/checkout/complete?reference=${encodeURIComponent(retry)}`} className="btn-primary">Refresh status</Link>}
        <Link href={cta?.href ?? "/"} className="btn-outline">{cta?.label ?? "Back to home"}</Link>
      </div>
    </div>
  );
}
