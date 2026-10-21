import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSelectedCurrency } from "@/lib/currency";
import { db } from "@/lib/db";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { CurrencySelector } from "./CurrencySelector";
import { CartButton } from "./CartButton";
import { MobileMenu } from "./MobileMenu";

export async function Header() {
  const [user, currency, categories] = await Promise.all([
    getCurrentUser(),
    getSelectedCurrency(),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  const nav = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/collections", label: "Collections" },
    { href: "/about", label: "About" },
    { href: "/track", label: "Track order" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/90 backdrop-blur supports-[backdrop-filter]:bg-ivory/80">
      <div className="bg-forest text-ivory">
        <div className="container-x flex h-8 items-center justify-between text-[11px] tracking-wide">
          <span className="truncate">Free Nigeria delivery on orders over $250 · Secure card payments</span>
          <span className="hidden sm:inline text-gold">Sample catalogue — demonstration products</span>
        </div>
      </div>
      <div className="container-x flex h-[72px] items-center justify-between gap-4">
        <div className="flex items-center gap-3 lg:hidden">
          <MobileMenu nav={nav} categories={categories} signedIn={!!user} isAdmin={user?.role === "ADMIN"} currency={currency} />
        </div>
        <Link href="/" aria-label="Summit Kitchen home" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-[13px] font-medium tracking-wide">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-charcoal/80 transition hover:text-olive">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <form action="/shop" className="relative hidden md:block" role="search">
            <label htmlFor="header-q" className="sr-only">Search products</label>
            <input id="header-q" name="q" type="search" placeholder="Search" className="input h-9 w-40 rounded-full py-1.5 pl-9 text-[13px] lg:w-48" />
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </form>
          <Link href="/shop" className="rounded-full p-2 hover:bg-sand md:hidden" aria-label="Search">
            <Icon name="search" />
          </Link>
          <div className="hidden sm:block">
            <CurrencySelector current={currency} compact />
          </div>
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="hidden rounded-full p-2 hover:bg-sand lg:inline-flex" aria-label="Admin dashboard" title="Admin">
              <Icon name="grid" />
            </Link>
          )}
          <Link href={user ? "/account" : "/account/login"} className="rounded-full p-2 hover:bg-sand" aria-label={user ? "Your account" : "Sign in"}>
            <Icon name="user" />
          </Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
