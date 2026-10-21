import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getPricing } from "@/lib/pricing";
import { toUsdCents } from "@/lib/money";
import { ProductCard } from "@/components/ProductCard";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Shop" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const SORTS = {
  featured: { label: "Featured", orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }] },
  newest: { label: "Newest", orderBy: [{ createdAt: "desc" }] },
  "price-asc": { label: "Price: low to high", orderBy: [{ priceUsdCents: "asc" }] },
  "price-desc": { label: "Price: high to low", orderBy: [{ priceUsdCents: "desc" }] },
  name: { label: "Name A–Z", orderBy: [{ name: "asc" }] },
} satisfies Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }>;
type SortKey = keyof typeof SORTS;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 100);

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q)?.trim() ?? "";
  const category = one(sp.category) ?? "";
  const material = one(sp.material) ?? "";
  const inStock = one(sp.inStock) === "1";
  const sort: SortKey = (one(sp.sort) ?? "featured") in SORTS ? (one(sp.sort) as SortKey) : "featured";
  const page = Math.max(1, Math.min(100, parseInt(one(sp.page) ?? "1", 10) || 1));
  const minRaw = parseFloat(one(sp.min) ?? "");
  const maxRaw = parseFloat(one(sp.max) ?? "");

  const pricing = await getPricing();
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { shortDescription: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { material: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (category) where.category = { slug: category };
  if (material) where.material = { equals: material };
  if (inStock) where.stock = { gt: 0 };
  const price: Prisma.IntFilter = {};
  if (Number.isFinite(minRaw) && minRaw >= 0) price.gte = toUsdCents(minRaw, pricing.currency, pricing.rate);
  if (Number.isFinite(maxRaw) && maxRaw > 0) price.lte = toUsdCents(maxRaw, pricing.currency, pricing.rate);
  if (price.gte !== undefined || price.lte !== undefined) where.priceUsdCents = price;

  const [categories, materials, total, products] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    db.product.findMany({ where: { isActive: true, material: { not: null } }, distinct: ["material"], select: { material: true }, orderBy: { material: "asc" } }),
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: SORTS[sort].orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: { select: { name: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeCat = categories.find((c) => c.slug === category);
  const sym = pricing.currency === "USD" ? "$" : "₦";

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const base: Record<string, string | undefined> = { q, category, material, inStock: inStock ? "1" : undefined, sort: sort === "featured" ? undefined : sort, min: one(sp.min), max: one(sp.max), ...over };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/shop?${s}` : "/shop";
  };

  const filters = (
    <form action="/shop" className="space-y-7" aria-label="Filter products">
      {q && <input type="hidden" name="q" value={q} />}
      {sort !== "featured" && <input type="hidden" name="sort" value={sort} />}
      <fieldset>
        <legend className="label">Category</legend>
        <select name="category" defaultValue={category} className="input">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </fieldset>
      <fieldset>
        <legend className="label">Price ({sym})</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="f-min">Minimum price</label>
          <input id="f-min" name="min" type="number" min={0} step="any" inputMode="decimal" placeholder="Min" defaultValue={one(sp.min)} className="input" />
          <span className="text-muted">–</span>
          <label className="sr-only" htmlFor="f-max">Maximum price</label>
          <input id="f-max" name="max" type="number" min={0} step="any" inputMode="decimal" placeholder="Max" defaultValue={one(sp.max)} className="input" />
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Material</legend>
        <select name="material" defaultValue={material} className="input">
          <option value="">Any material</option>
          {materials.map((m) => m.material && <option key={m.material} value={m.material}>{m.material}</option>)}
        </select>
      </fieldset>
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="inStock" value="1" defaultChecked={inStock} className="h-4 w-4 accent-olive" />
        In stock only
      </label>
      <div className="flex gap-2">
        <button className="btn-primary flex-1 py-2.5">Apply</button>
        <Link href={q ? `/shop?q=${encodeURIComponent(q)}` : "/shop"} className="btn-outline py-2.5">Reset</Link>
      </div>
    </form>
  );

  return (
    <div className="container-x py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-charcoal">Home</Link> <span aria-hidden>/</span>{" "}
        <Link href="/shop" className="hover:text-charcoal">Shop</Link>
        {activeCat && <> <span aria-hidden>/</span> <span className="text-charcoal">{activeCat.name}</span></>}
      </nav>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">{q ? `Results for “${q}”` : activeCat?.name ?? "All products"}</h1>
          <p className="mt-2 text-sm text-muted">{total} product{total === 1 ? "" : "s"} · prices in {pricing.currency}</p>
        </div>
        <form action="/shop" className="flex w-full gap-2 sm:w-auto" role="search">
          {category && <input type="hidden" name="category" value={category} />}
          <label htmlFor="shop-q" className="sr-only">Search products</label>
          <input id="shop-q" name="q" type="search" defaultValue={q} placeholder="Search products" className="input sm:w-64" />
          <button className="btn-primary px-4 py-2.5" aria-label="Search"><Icon name="search" className="h-4 w-4" /></button>
        </form>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" aria-label="Categories">
        <Link href={qs({ category: undefined, page: undefined })} className={`rounded-full border px-4 py-1.5 text-xs font-medium ${!category ? "border-charcoal bg-charcoal text-ivory" : "border-line bg-white hover:border-charcoal/40"}`}>All</Link>
        {categories.map((c) => (
          <Link key={c.slug} href={qs({ category: c.slug, page: undefined })} className={`rounded-full border px-4 py-1.5 text-xs font-medium ${category === c.slug ? "border-charcoal bg-charcoal text-ivory" : "border-line bg-white hover:border-charcoal/40"}`}>
            {c.name}
          </Link>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <aside>
          <details className="card group p-5 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2"><Icon name="filter" className="h-4 w-4" /> Filters</span>
              <Icon name="chevronDown" className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="mt-5">{filters}</div>
          </details>
          <div className="hidden lg:block">{filters}</div>
        </aside>

        <div>
          <div className="mb-6 flex flex-wrap items-center justify-end gap-2 text-sm">
            <span className="text-muted">Sort:</span>
            {(Object.keys(SORTS) as SortKey[]).map((k) => (
              <Link key={k} href={qs({ sort: k === "featured" ? undefined : k, page: undefined })} className={`rounded-full px-3 py-1 text-xs ${sort === k ? "bg-sand font-semibold" : "text-muted hover:text-charcoal"}`}>
                {SORTS[k].label}
              </Link>
            ))}
          </div>
          {products.length === 0 ? (
            <div className="card px-6 py-16 text-center">
              <h2 className="font-display text-2xl">No products match</h2>
              <p className="mt-2 text-sm text-muted">Try a different search or clear the filters.</p>
              <Link href="/shop" className="btn-outline mt-6">Clear all</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6">
              {products.map((p, i) => <ProductCard key={p.id} p={p} pricing={pricing} priority={i < 3} />)}
            </div>
          )}
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={qs({ page: n === 1 ? undefined : String(n) })} aria-current={n === page ? "page" : undefined}
                  className={`grid h-9 w-9 place-items-center rounded-full text-sm ${n === page ? "bg-charcoal text-ivory" : "border border-line bg-white"}`}>{n}</Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
