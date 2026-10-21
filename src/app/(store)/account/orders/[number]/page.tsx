import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { CUSTOMER_STATUS_LABEL } from "@/lib/orders";
import { OrderTimeline } from "@/components/OrderTimeline";

export const dynamic = "force-dynamic";

export default async function AccountOrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${encodeURIComponent(number)}`);
  // ownership is enforced in the query itself — another customer's order number returns 404
  const o = await db.order.findFirst({
    where: { number: number.slice(0, 30), userId: user.id },
    include: { items: true, events: { where: { internal: false }, orderBy: { createdAt: "asc" } } },
  });
  if (!o) notFound();
  return (
    <div className="container-x max-w-3xl py-12">
      <Link href="/account" className="text-sm text-olive hover:underline">← My account</Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Order {o.number}</h1>
        <span className="rounded-full bg-olive/10 px-4 py-1.5 text-sm font-semibold text-olive">{CUSTOMER_STATUS_LABEL[o.status]}</span>
      </div>
      <div className="card mt-6 p-6">
        <OrderTimeline statusKey={o.status} events={o.events.map((e) => ({ status: e.status, message: e.message, at: e.createdAt.toISOString() }))} />
        {o.trackingNumber && <p className="mt-6 text-sm"><span className="text-muted">Tracking:</span> <strong>{o.trackingCarrier} {o.trackingNumber}</strong></p>}
      </div>
      <div className="card mt-6 p-6">
        <ul className="space-y-2 text-sm">
          {o.items.map((i) => <li key={i.id} className="flex justify-between"><span>{i.quantity} × {i.name}</span><span>{formatMoney(i.lineTotal, o.currency)}</span></li>)}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(o.subtotal, o.currency)}</dd></div>
          <div className="flex justify-between"><dt>Delivery ({o.shippingMethod})</dt><dd>{o.shippingFee === 0 ? "Free" : formatMoney(o.shippingFee, o.currency)}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatMoney(o.total, o.currency)}</dd></div>
        </dl>
        <p className="mt-4 text-sm text-muted">Delivering to {o.shipFullName}, {o.shipLine1}, {o.shipCity}, {o.shipState}, {o.shipCountry}</p>
      </div>
    </div>
  );
}
