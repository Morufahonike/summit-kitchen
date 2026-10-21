import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ADMIN_TRANSITIONS, CUSTOMER_STATUS_LABEL } from "@/lib/orders";
import { StatusPill } from "@/components/admin/StatusPill";
import { ActionForm, FieldError, Submit } from "@/components/admin/ActionForm";
import { addOrderNoteAction, reverifyPaymentAction, updateOrderStatusAction } from "@/app/actions/admin";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "desc" } }, user: { select: { name: true, email: true } } },
  });
  if (!o) notFound();
  const next = ADMIN_TRANSITIONS[o.status] ?? [];

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-olive">← Orders</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl">{o.number}</h1>
        <StatusPill status={o.status} label={CUSTOMER_STATUS_LABEL[o.status]} />
      </div>
      {o.status === "NEEDS_REVIEW" && (
        <p className="rounded-xl border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          This order needs manual review (see internal notes below). Do not ship until the payment has been checked in the Paystack dashboard.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-display text-xl">Items</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {o.items.map((i) => (
                  <tr key={i.id}><td className="py-2">{i.name}<p className="text-xs text-muted">{i.sku}</p></td><td className="py-2 text-center">× {i.quantity}</td><td className="py-2 text-right">{formatMoney(i.lineTotal, o.currency)}</td></tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(o.subtotal, o.currency)}</dd></div>
              <div className="flex justify-between"><dt>Shipping ({o.shippingMethod})</dt><dd>{formatMoney(o.shippingFee, o.currency)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total charged</dt><dd>{formatMoney(o.total, o.currency)}</dd></div>
              <div className="flex justify-between text-xs text-muted"><dt>Browsed in {o.displayCurrency} · rate locked</dt><dd>₦{Number(o.exchangeRate).toLocaleString()} / $1</dd></div>
            </dl>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-display text-xl">Payments</h2>
            <ul className="space-y-3 text-sm">
              {o.payments.map((p) => (
                <li key={p.id} className="rounded-lg bg-ivory p-3">
                  <div className="flex flex-wrap justify-between gap-2"><span className="font-mono text-xs">{p.reference}</span><span className="font-semibold">{p.status}</span></div>
                  <p className="mt-1 text-xs text-muted">
                    {p.provider} · expected {formatMoney(p.amount, p.currency)}
                    {p.paidAmount != null && <> · received {p.paidAmount / 100} {p.paidCurrency}</>}
                    {p.cardBrand && <> · {p.cardBrand} •••• {p.last4}</>}
                  </p>
                  {p.failureReason && <p className="mt-1 text-xs text-danger">{p.failureReason}</p>}
                  <ActionForm action={reverifyPaymentAction} className="mt-2">
                    <input type="hidden" name="reference" value={p.reference} />
                    <Submit className="btn-outline px-3 py-1.5 text-xs" pendingLabel="Verifying…">Re-verify with provider</Submit>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-display text-xl">History</h2>
            <ul className="space-y-3 text-sm">
              {o.events.map((e) => (
                <li key={e.id} className={`rounded-lg p-3 ${e.internal ? "border border-dashed border-gold bg-gold/5" : "bg-ivory"}`}>
                  <p>{e.message}</p>
                  <p className="mt-1 text-xs text-muted">{e.createdAt.toLocaleString("en-GB")} · {CUSTOMER_STATUS_LABEL[e.status]}{e.internal && " · internal"}</p>
                </li>
              ))}
            </ul>
            <ActionForm action={addOrderNoteAction} className="mt-4 space-y-2">
              <input type="hidden" name="orderId" value={o.id} />
              <textarea name="note" rows={2} maxLength={500} placeholder="Internal note (not visible to customer)" className="input" />
              <FieldError name="note" />
              <Submit className="btn-outline py-2 text-xs">Add note</Submit>
            </ActionForm>
          </section>
        </div>
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-display text-xl">Update status</h2>
            {next.length === 0 ? (
              <p className="text-sm text-muted">No manual changes available for this status.</p>
            ) : (
              <ActionForm action={updateOrderStatusAction} className="space-y-3">
                <input type="hidden" name="orderId" value={o.id} />
                <select name="status" className="input" defaultValue={next[0]}>
                  {next.map((s) => <option key={s} value={s}>{CUSTOMER_STATUS_LABEL[s]}</option>)}
                </select>
                <input name="trackingCarrier" placeholder="Carrier (e.g. GIG Logistics)" defaultValue={o.trackingCarrier ?? ""} className="input" />
                <input name="trackingNumber" placeholder="Tracking number" defaultValue={o.trackingNumber ?? ""} className="input" />
                <FieldError name="trackingNumber" />
                <input name="message" placeholder="Message to customer (optional)" className="input" maxLength={300} />
                <Submit>Update order</Submit>
              </ActionForm>
            )}
          </section>
          <section className="card space-y-1 p-5 text-sm">
            <h2 className="mb-2 font-display text-xl">Customer</h2>
            <p>{o.shipFullName}</p>
            <p className="text-muted">{o.email}{o.user ? " · registered" : " · guest"}</p>
            <p className="text-muted">{o.shipPhone}</p>
            <p className="pt-2">{o.shipLine1}{o.shipLine2 ? `, ${o.shipLine2}` : ""}</p>
            <p>{o.shipCity}, {o.shipState} {o.shipPostalCode}</p>
            <p>{o.shipCountry}</p>
            {o.notes && <p className="mt-3 rounded-lg bg-ivory p-3"><span className="text-xs text-muted">Customer note:</span><br />{o.notes}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
