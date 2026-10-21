"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { Icon } from "./Icon";

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="relative rounded-full p-2 hover:bg-sand" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
      <Icon name="bag" />
      {ready && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-charcoal">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
