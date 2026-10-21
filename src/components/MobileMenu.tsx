"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { CurrencySelector } from "./CurrencySelector";
import type { CurrencyCode } from "@/lib/money";

export function MobileMenu({
  nav,
  categories,
  signedIn,
  isAdmin,
  currency,
}: {
  nav: { href: string; label: string }[];
  categories: { slug: string; name: string }[];
  signedIn: boolean;
  isAdmin: boolean;
  currency: CurrencyCode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button type="button" className="rounded-full p-2 hover:bg-sand" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <Icon name="menu" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-charcoal/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-ivory p-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between">
              <Logo variant="horizontal" />
              <button className="rounded-full p-2 hover:bg-sand" aria-label="Close menu" onClick={() => setOpen(false)}>
                <Icon name="x" />
              </button>
            </div>
            <form action="/shop" role="search" className="relative mb-6">
              <label htmlFor="m-q" className="sr-only">Search products</label>
              <input id="m-q" name="q" type="search" placeholder="Search products" className="input rounded-full pl-10" />
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </form>
            <ul className="space-y-1 border-b border-line pb-5">
              {nav.map((n) => (
                <li key={n.href}><Link className="block py-2 font-display text-xl" href={n.href}>{n.label}</Link></li>
              ))}
            </ul>
            <p className="eyebrow mt-6 mb-3">Shop by category</p>
            <ul className="space-y-1">
              {categories.map((c) => (
                <li key={c.slug}><Link className="block py-1.5 text-sm text-charcoal/80" href={`/shop?category=${c.slug}`}>{c.name}</Link></li>
              ))}
            </ul>
            <div className="mt-auto space-y-4 pt-8">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Currency</span>
                <CurrencySelector current={currency} />
              </div>
              <Link href={signedIn ? "/account" : "/account/login"} className="btn-outline w-full">{signedIn ? "My account" : "Sign in / Register"}</Link>
              {isAdmin && <Link href="/admin" className="btn-primary w-full">Admin dashboard</Link>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
