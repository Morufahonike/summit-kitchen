"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useCart } from "@/components/CartProvider";
import { useQuote } from "@/components/useQuote";
import { Icon } from "@/components/Icon";
import { COUNTRIES } from "@/lib/countries";
import { SHIPPING_METHODS, type ShippingMethod } from "@/lib/shipping";
import { placeOrderAction } from "@/app/actions/checkout";

type Defaults = Record<"email" | "fullName" | "phone" | "line1" | "line2" | "city" | "state" | "postalCode" | "country", string>;

export function CheckoutForm({ defaults, signedIn, chargeNotice }: { defaults: Defaults; signedIn: boolean; chargeNotice: boolean }) {
  const { items, ready } = useCart();
  const [form, setForm] = useState<Defaults & { notes: string }>({ ...defaults, notes: "" });
  const domestic = form.country === "NG";
  const [method, setMethod] = useState<ShippingMethod>(domestic ? "LAGOS_STANDARD" : "INTERNATIONAL");
  const effectiveMethod: ShippingMethod = domestic ? (method === "INTERNATIONAL" ? "LAGOS_STANDARD" : method) : "INTERNATIONAL";
  const { data, loading } = useQuote(items, ready, { method: effectiveMethod, country: form.country });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  if (ready && items.length === 0) {
    return (
      <div className="card mt-8 px-6 py-16 text-center">
        <h2 className="font-display text-2xl">Your cart is empty</h2>
        <Link href="/shop" className="btn-gold mt-6">Browse products</Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    start(async () => {
      const res = await placeOrderAction({ ...form, shippingMethod: effectiveMethod, items });
      if (res.ok) {
        // cart is cleared only after payment is confirmed (on the completion page)
        window.location.assign(res.redirectUrl);
      } else {
        setErrors(res.fields ?? {});
        setFormError(res.error ?? null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const field = (k: keyof Defaults, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`co-${k}`} className="label">{label}</label>
      <input id={`co-${k}`} name={k} value={form[k]} onChange={set(k)} className="input" aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `co-${k}-err` : undefined} {...props} />
      {errors[k] && <p id={`co-${k}-err`} className="field-error">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]" noValidate>
      <div className="space-y-8">
        {formError && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">{formError}</div>}
        <section className="card p-6 sm:p-8">
          <h2 className="mb-5 font-display text-2xl">Contact</h2>
          {field("email", "Email", { type: "email", autoComplete: "email", required: true, readOnly: signedIn })}
          {!signedIn && (
            <p className="mt-3 text-xs text-muted">
              Have an account? <Link href="/account/login?next=/checkout" className="font-semibold text-olive underline">Sign in</Link> to save this order to your account.
            </p>
          )}
        </section>
        <section className="card p-6 sm:p-8">
          <h2 className="mb-5 font-display text-2xl">Delivery address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("fullName", "Full name", { autoComplete: "name", required: true })}</div>
            <div className="sm:col-span-2">{field("phone", "Phone", { type: "tel", autoComplete: "tel", required: true, placeholder: "+234 …" })}</div>
            <div className="sm:col-span-2">{field("line1", "Street address", { autoComplete: "address-line1", required: true })}</div>
            <div className="sm:col-span-2">{field("line2", "Apartment, suite (optional)", { autoComplete: "address-line2" })}</div>
            {field("city", "City", { autoComplete: "address-level2", required: true })}
            {field("state", "State / region", { autoComplete: "address-level1", required: true })}
            {field("postalCode", "Postal code (optional)", { autoComplete: "postal-code" })}
            <div>
              <label htmlFor="co-country" className="label">Country</label>
              <select id="co-country" value={form.country} onChange={set("country")} className="input" autoComplete="country">
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              {errors.country && <p className="field-error">{errors.country}</p>}
            </div>
          </div>
        </section>
        <section className="card p-6 sm:p-8">
          <h2 className="mb-5 font-display text-2xl">Delivery method</h2>
          <div className="space-y-3">
            {(Object.keys(SHIPPING_METHODS) as ShippingMethod[])
              .filter((m) => (domestic ? m !== "INTERNATIONAL" : m === "INTERNATIONAL"))
              .map((m) => (
                <label key={m} className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 text-sm ${effectiveMethod === m ? "border-olive bg-olive/5" : "border-line"}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="shippingMethod" value={m} checked={effectiveMethod === m} onChange={() => setMethod(m)} className="accent-olive" />
                    <span>
                      <span className="font-semibold">{SHIPPING_METHODS[m].label}</span>
                      <span className="block text-xs text-muted">{SHIPPING_METHODS[m].eta}</span>
                    </span>
                  </span>
                </label>
              ))}
          </div>
          <p className="mt-3 text-xs text-muted">Delivery rates shown are provisional.</p>
          <div className="mt-6">
            <label htmlFor="co-notes" className="label">Order notes (optional)</label>
            <textarea id="co-notes" rows={3} maxLength={500} value={form.notes} onChange={set("notes")} className="input" />
          </div>
        </section>
      </div>

      <aside className="card h-fit p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl">Your order</h2>
        {!data ? (
          <p className="mt-4 text-sm text-muted">Loading…</p>
        ) : (
          <>
            {data.issues.length > 0 && <div role="alert" className="mt-4 rounded-lg bg-gold/10 p-3 text-xs">{data.issues.map((m) => <p key={m}>{m}</p>)}</div>}
            <ul className="mt-5 space-y-3 text-sm">
              {data.lines.map((l) => (
                <li key={l.productId} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{l.quantity} × {l.name}</span>
                  <span className="shrink-0">{l.lineTotalFormatted}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{data.subtotalFormatted}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{data.shippingError ? "—" : data.shippingFormatted ?? "—"}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd className={loading ? "opacity-50" : ""}>{data.totalFormatted}</dd></div>
            </dl>
            {data.shippingError && <p className="field-error">{data.shippingError}</p>}
          </>
        )}
        {chargeNotice && (
          <p className="mt-4 rounded-lg bg-sand p-3 text-xs leading-relaxed text-muted">
            You&rsquo;re viewing prices in USD. Your card will be charged the <strong>NGN equivalent</strong> at today&rsquo;s rate; the exact naira amount is shown on the secure payment page. Your bank may apply its own conversion fees.
          </p>
        )}
        <button type="submit" disabled={pending || !data || data.lines.length === 0 || !!data.shippingError} className="btn-gold mt-6 w-full">
          <Icon name="lock" className="h-4 w-4" /> {pending ? "Placing order…" : "Pay securely"}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
          <Icon name="shield" className="h-3.5 w-3.5" /> Mastercard, Visa & Verve via Paystack. We never see your card number.
        </p>
      </aside>
    </form>
  );
}
