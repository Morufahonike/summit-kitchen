import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Inventory" };

export default async function AdminInventory() {
  await requireAdmin();
  const [products, movements, reserved] = await Promise.all([
    db.product.findMany({ orderBy: { stock: "asc" }, select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true, isActive: true } }),
    db.inventoryMovement.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { product: { select: { name: true } } } }),
    db.orderItem.groupBy({ by: ["productId"], where: { order: { status: "PENDING_PAYMENT" } }, _sum: { quantity: true } }),
  ]);
  const held = new Map(reserved.map((r) => [r.productId, r._sum.quantity ?? 0]));
  const totalUnits = products.reduce((s, p) => s + p.stock, 0);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Inventory</h1>
      <p className="text-sm text-muted">{totalUnits} units available across {products.length} products. &ldquo;Held&rdquo; = reserved by orders awaiting payment (released automatically if unpaid after 60 minutes).</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-ivory text-left text-xs uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3 text-right">Available</th><th className="px-4 py-3 text-right">Held</th><th className="px-4 py-3 text-right">Alert at</th></tr></thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5"><Link href={`/admin/products/${p.id}`} className="hover:text-olive">{p.name}</Link><span className="block font-mono text-[11px] text-muted">{p.sku}{!p.isActive && " · hidden"}</span></td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${p.stock === 0 ? "text-danger" : p.stock <= p.lowStockThreshold ? "text-[#9a6a1c]" : ""}`}>{p.stock}</td>
                  <td className="px-4 py-2.5 text-right text-muted">{held.get(p.id) ?? 0}</td>
                  <td className="px-4 py-2.5 text-right text-muted">{p.lowStockThreshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-display text-xl">Recent movements</h2>
          <ul className="divide-y divide-line text-sm">
            {movements.map((m) => (
              <li key={m.id} className="flex justify-between gap-3 py-2">
                <span>{m.product.name}<span className="block text-xs text-muted">{m.reason} · {m.createdAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span></span>
                <span className={m.change < 0 ? "text-danger" : "text-olive"}>{m.change > 0 ? "+" : ""}{m.change}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
