"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import { useQuote } from "@/components/useQuote";
import { Icon } from "@/components/Icon";
import { SampleBadge } from "@/components/SampleBadge";

export function CartView() {
  const { items, ready, setQuantity, remove, replace } = useCart();
  const { data, error, loading } = useQuote(items, ready);

  // drop items the server says are unavailable / clamp to stock
  useEffect(() => {
    if (!data) return;
    const next = data.lines.map((l) => ({ productId: l.productId, quantity: l.quantity }));
    const same = next.length === items.length && next.every((n) => items.some((i) => i.productId === n.productId && i.quantity === n.quantity));
    if (!same) replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!ready || (loading && !data)) return <p className="text-muted">Loading your cart…</p>;
  if (items.length === 0 || (data && data.lines.length === 0)) {
    return (
      <div className="card px-6 py-16 text-center">
        <Icon name="bag" className="mx-auto h-10 w-10 text-taupe" />
        <h2 className="mt-4 font-display text-2xl">Your cart is empty</h2>
        <p className="mt-2 text-sm text-muted">Discover cookware, knives and kitchen essentials.</p>
        <Link href="/shop" className="btn-gold mt-6">Start shopping</Link>
      </div>
    );
  }
  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return null;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        {data.issues.length > 0 && (
          <div role="alert" className="mb-6 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
            {data.issues.map((m) => <p key={m}>{m}</p>)}
          </div>
        )}
        <ul className="divide-y divide-line border-y border-line">
          {data.lines.map((l) => (
            <li key={l.productId} className="flex gap-4 py-5">
              <Link href={`/product/${l.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-sand sm:h-28 sm:w-28">
                {l.image && <Image src={l.image} alt={l.name} fill sizes="112px" className="object-cover" unoptimized={l.image.endsWith(".svg")} />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/product/${l.slug}`} className="font-display text-lg leading-snug hover:text-olive">{l.name}</Link>
                    <p className="mt-0.5 text-sm text-muted">{l.unitPriceFormatted} each</p>
                    {l.isSample && <SampleBadge className="mt-1.5 inline-block" />}
                  </div>
                  <p className="shrink-0 font-semibold">{l.lineTotalFormatted}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex items-center rounded-full border border-line bg-white">
                    <button className="grid h-8 w-8 place-items-center disabled:opacity-40" aria-label={`Decrease ${l.name}`} disabled={l.quantity <= 1} onClick={() => setQuantity(l.productId, l.quantity - 1)}>
                      <Icon name="minus" className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm">{l.quantity}</span>
                    <button className="grid h-8 w-8 place-items-center disabled:opacity-40" aria-label={`Increase ${l.name}`} disabled={l.quantity >= Math.min(20, l.available)} onClick={() => setQuantity(l.productId, l.quantity + 1)}>
                      <Icon name="plus" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-muted hover:text-danger" onClick={() => remove(l.productId)}>
                    <Icon name="trash" className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/shop" className="mt-6 inline-block text-sm font-semibold text-olive hover:underline">← Continue shopping</Link>
      </div>
      <aside className="card h-fit p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl">Order summary</h2>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{data.subtotalFormatted}</dd></div>
          <div className="flex justify-between text-muted"><dt>Shipping</dt><dd>Calculated at checkout</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">Free Nigeria delivery on orders over {data.freeShippingThresholdFormatted}.</p>
        <Link href="/checkout" className="btn-gold mt-6 w-full">
          <Icon name="lock" className="h-4 w-4" /> Proceed to checkout
        </Link>
        {data.currency === "USD" && data.chargeCurrency === "NGN" && (
          <p className="mt-4 rounded-lg bg-sand p-3 text-xs leading-relaxed text-muted">
            Prices are shown in USD. Your card will be charged the equivalent amount in Nigerian naira (NGN); your bank may apply its own conversion.
          </p>
        )}
      </aside>
    </div>
  );
}
