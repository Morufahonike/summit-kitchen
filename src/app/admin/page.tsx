import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { CUSTOMER_STATUS_LABEL } from "@/lib/orders";
import { StatusPill } from "@/components/admin/StatusPill";

const PAID_STATES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function AdminDashboard() {
  await requireAdmin(); // checked per page too: layouts are not re-run on every client navigation
  const since = new Date(Date.now() - 30 * 86400_000);
  const [revenue, ordersTotal, pending, review, toFulfil, lowStock, recent, customers] = await Promise.all([
    db.order.groupBy({ by: ["currency"], where: { status: { in: [...PAID_STATES] }, paidAt: { gte: since } }, _sum: { total: true }, _count: true }),
    db.order.count(),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.order.count({ where: { status: "NEEDS_REVIEW" } }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    db.$queryRaw<{ id: string; name: string; stock: number; lowStockThreshold: number }[]>`
      SELECT id, name, stock, "lowStockThreshold" FROM "Product" WHERE "isActive" = true AND stock <= "lowStockThreshold" ORDER BY stock ASC LIMIT 10`,
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  const tiles = [
    ...(["NGN", "USD"] as const).map((c) => {
      const r = revenue.find((x) => x.currency === c);
      return { label: `Revenue (30 days, ${c})`, value: formatMoney(r?._sum.total ?? 0, c), sub: `${r?._count ?? 0} paid orders` };
    }),
    { label: "To fulfil", value: String(toFulfil), sub: "Paid or processing", href: "/admin/orders?status=PAID" },
    { label: "Needs review", value: String(review), sub: "Amount mismatch / late payment", href: "/admin/orders?status=NEEDS_REVIEW", alert: review > 0 },
    { label: "Awaiting payment", value: String(pending), sub: `${ordersTotal} orders all-time` },
    { label: "Customers", value: String(customers), sub: "Registered accounts" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => {
          const body = (
            <div className={`card h-full p-5 ${"alert" in t && t.alert ? "border-danger/40" : ""}`}>
              <p className="text-xs uppercase tracking-wider text-muted">{t.label}</p>
              <p className={`mt-2 font-display text-3xl ${"alert" in t && t.alert ? "text-danger" : ""}`}>{t.value}</p>
              <p className="mt-1 text-xs text-muted">{t.sub}</p>
            </div>
          );
          return "href" in t && t.href ? <Link key={t.label} href={t.href}>{body}</Link> : <div key={t.label}>{body}</div>;
        })}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between p-5"><h2 className="font-display text-xl">Recent orders</h2><Link href="/admin/orders" className="text-sm text-olive">All orders →</Link></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <tbody className="divide-y divide-line">
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td className="px-5 py-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-olive">{o.number}</Link><p className="text-xs text-muted">{o.email}</p></td>
                    <td className="px-5 py-3"><StatusPill status={o.status} label={CUSTOMER_STATUS_LABEL[o.status]} /></td>
                    <td className="px-5 py-3 text-right font-semibold">{formatMoney(o.total, o.currency)}</td>
                  </tr>
                ))}
                {recent.length === 0 && <tr><td className="px-5 py-8 text-center text-muted">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl">Low stock</h2><Link href="/admin/inventory" className="text-sm text-olive">Inventory →</Link></div>
          <ul className="divide-y divide-line text-sm">
            {lowStock.map((p) => (
              <li key={p.id} className="flex justify-between py-2.5">
                <Link href={`/admin/products/${p.id}`} className="hover:text-olive">{p.name}</Link>
                <span className={p.stock === 0 ? "font-semibold text-danger" : "text-[#9a6a1c]"}>{p.stock === 0 ? "Out" : p.stock}</span>
              </li>
            ))}
            {lowStock.length === 0 && <li className="py-4 text-muted">All products above threshold.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
