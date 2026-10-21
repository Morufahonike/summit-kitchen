import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 bg-forest text-ivory/80">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed">
            Premium kitchen and homeware products designed for modern living — thoughtfully curated for quality, functionality and timeless elegance.
          </p>
        </div>
        <div>
          <p className="eyebrow text-gold! mb-4">Shop</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/shop?category=cookware" className="hover:text-ivory">Cookware</Link></li>
            <li><Link href="/shop?category=knives-cutting-boards" className="hover:text-ivory">Knives & Boards</Link></li>
            <li><Link href="/shop?category=appliances" className="hover:text-ivory">Appliances</Link></li>
            <li><Link href="/collections" className="hover:text-ivory">All collections</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-gold! mb-4">Customer care</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/track" className="hover:text-ivory">Track an order</Link></li>
            <li><Link href="/account" className="hover:text-ivory">My account</Link></li>
            <li><Link href="/about#shipping" className="hover:text-ivory">Shipping & returns</Link></li>
            <li><Link href="/about#services" className="hover:text-ivory">Repairs & servicing</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-gold! mb-4">Payments</p>
          <p className="text-sm leading-relaxed">Mastercard, Visa and Verve accepted through Paystack. Card details are entered on Paystack&rsquo;s secure page and never stored by Summit Kitchen.</p>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-ivory/60 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} Summit Kitchen Services Limited. All rights reserved.</span>
          <span>Development build · sample products · payments in test mode</span>
        </div>
      </div>
    </footer>
  );
}
