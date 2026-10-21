import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { paymentMode } from "@/lib/payments";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";
import { logoutAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Summit Kitchen" } };
export const dynamic = "force-dynamic";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  let mode = "unconfigured";
  try { mode = paymentMode(); } catch { /* shown as unconfigured */ }
  return (
    <div className="min-h-screen bg-sand/60 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-forest text-ivory lg:min-h-screen lg:border-b-0">
        <div className="flex items-center justify-between p-5 lg:block">
          <Link href="/admin"><Logo variant="horizontal" tone="light" /></Link>
          <p className="hidden pt-1 text-[10px] uppercase tracking-[0.3em] text-gold lg:block">Admin</p>
        </div>
        <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:px-3">
          <ul className="flex gap-1 lg:flex-col">
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ivory/80 hover:bg-ivory/10 hover:text-ivory">{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden space-y-3 p-5 text-xs text-ivory/60 lg:block">
          <p>Signed in as<br /><span className="text-ivory">{admin.email}</span></p>
          <Link href="/" className="block hover:text-ivory">← View store</Link>
          <form action={logoutAction}><button className="flex items-center gap-1.5 hover:text-ivory"><Icon name="logout" className="h-4 w-4" /> Sign out</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <div className={`px-5 py-2 text-xs font-semibold ${mode === "live" ? "bg-danger text-white" : "bg-gold/30 text-charcoal"}`}>
          Payments: {mode === "mock" ? "SIMULATOR (development)" : mode === "test" ? "Paystack TEST mode" : mode === "live" ? "LIVE — real cards are charged" : "not configured"} · Catalogue: sample products
        </div>
        <div className="p-4 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
