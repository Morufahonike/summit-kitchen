"use client";

import { useActionState } from "react";
import { trackOrderAction, type TrackResult } from "@/app/actions/track";
import { OrderTimeline } from "@/components/OrderTimeline";

export function TrackForm({ defaultOrder }: { defaultOrder: string }) {
  const [state, action, pending] = useActionState<TrackResult, FormData>(trackOrderAction, { state: "idle" });
  return (
    <>
      <form action={action} className="card mt-8 grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="t-order" className="label">Order number</label>
          <input id="t-order" name="order" required defaultValue={defaultOrder} placeholder="SK-261021-ABC123" className="input uppercase" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="t-email" className="label">Email</label>
          <input id="t-email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <button className="btn-primary" disabled={pending}>{pending ? "Checking…" : "Track"}</button>
      </form>
      {state.state === "error" && <p role="alert" className="mt-4 text-sm text-danger">{state.message}</p>}
      {state.state === "found" && (
        <section className="card mt-8 p-6 sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Order</p>
              <p className="font-display text-2xl">{state.order.number}</p>
            </div>
            <span className="rounded-full bg-olive/10 px-4 py-1.5 text-sm font-semibold text-olive">{state.order.status}</span>
          </div>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-muted">Placed</dt><dd>{new Date(state.order.placed).toLocaleDateString(undefined, { dateStyle: "medium" })}</dd></div>
            <div><dt className="text-muted">Total</dt><dd>{state.order.total}</dd></div>
            <div><dt className="text-muted">Delivery</dt><dd>{state.order.shippingMethod} · {state.order.city}</dd></div>
            {state.order.tracking && <div className="sm:col-span-3"><dt className="text-muted">Tracking</dt><dd className="font-semibold">{state.order.tracking}</dd></div>}
          </dl>
          <OrderTimeline statusKey={state.order.statusKey} events={state.order.events} />
          <ul className="mt-6 border-t border-line pt-4 text-sm">
            {state.order.items.map((i) => <li key={i.name}>{i.quantity} × {i.name}</li>)}
          </ul>
        </section>
      )}
    </>
  );
}
