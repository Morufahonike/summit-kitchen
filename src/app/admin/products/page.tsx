import Link from "next/link";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Products" };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  await requireAdmin();
  const { q, category } = await searchParams;
  const where: Prisma.ProductWhereInput = {};
  const query = q?.trim().slice(0, 80);
  if (query) where.OR = [{ name: { contains: query, mode: "insensitive" } }, { sku: { contains: query, mode: "insensitive" } }];
  if (category) where.category = { slug: category };
  const [products, categories] = await Promise.all([
    db.product.findMany({ where, orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }], include: { category: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Products</h1>
        <Link href="/admin/products/new" className="btn-primary py-2.5">Add product</Link>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={query} placeholder="Name or SKU" className="input max-w-xs" />
        <select name="category" defaultValue={category ?? ""} className="input max-w-[220px]">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <button className="btn-primary py-2.5">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-ivory text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Price (USD)</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3">Flags</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-ivory">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-medium hover:text-olive">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-sand">{p.images[0] && <Image src={p.images[0]} alt="" fill sizes="40px" unoptimized />}</span>
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-2.5 text-muted">{p.category.name}</td>
                <td className="px-4 py-2.5 text-right">{formatMoney(p.priceUsdCents, "USD")}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${p.stock === 0 ? "text-danger" : p.stock <= p.lowStockThreshold ? "text-[#9a6a1c]" : ""}`}>{p.stock}</td>
                <td className="space-x-1 px-4 py-2.5 text-[10px] font-semibold uppercase">
                  {!p.isActive && <span className="rounded bg-charcoal/10 px-1.5 py-0.5">Hidden</span>}
                  {p.isFeatured && <span className="rounded bg-gold/25 px-1.5 py-0.5">Featured</span>}
                  {p.isSample && <span className="rounded bg-sand px-1.5 py-0.5">Sample</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
