"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";
import { Icon } from "./Icon";

export function AddToCart({ productId, max, disabled }: { productId: string; max: number; disabled?: boolean }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  if (disabled) {
    return <button className="btn-outline w-full sm:w-auto" disabled>Out of stock</button>;
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="inline-flex h-12 items-center justify-between rounded-full border border-line bg-white px-1.5 sm:w-36">
        <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand disabled:opacity-40" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
          <Icon name="minus" className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-sm font-semibold" aria-live="polite" aria-label={`Quantity ${qty}`}>{qty}</span>
        <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-sand disabled:opacity-40" aria-label="Increase quantity" disabled={qty >= max} onClick={() => setQty((q) => Math.min(max, q + 1))}>
          <Icon name="plus" className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        className="btn-gold h-12 flex-1"
        onClick={() => {
          add(productId, qty);
          setAdded(true);
        }}
      >
        <Icon name="bag" className="h-4 w-4" /> Add to cart
      </button>
      {added && (
        <p role="status" className="text-sm text-olive sm:hidden">
          Added. <Link href="/cart" className="font-semibold underline">View cart</Link>
        </p>
      )}
      {added && (
        <Link href="/cart" className="btn-outline hidden h-12 sm:inline-flex">View cart</Link>
      )}
    </div>
  );
}
