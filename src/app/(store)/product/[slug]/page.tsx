import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getPricing } from "@/lib/pricing";
import { ProductCard } from "@/components/ProductCard";
import { Gallery } from "@/components/Gallery";
import { AddToCart } from "@/components/AddToCart";
import { SampleBadge } from "@/components/SampleBadge";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  return db.product.findFirst({ where: { slug, isActive: true }, include: { category: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: p.name, description: p.shortDescription } : { title: "Product not found" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  const [pricing, related] = await Promise.all([
    getPricing(),
    db.product.findMany({
      where: { isActive: true, categoryId: p.categoryId, id: { not: p.id } },
      take: 4,
      include: { category: { select: { name: true } } },
    }),
  ]);
  const low = p.stock > 0 && p.stock <= p.lowStockThreshold;

  return (
    <div className="container-x py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-charcoal">Home</Link> / <Link href="/shop" className="hover:text-charcoal">Shop</Link> /{" "}
        <Link href={`/shop?category=${p.category.slug}`} className="hover:text-charcoal">{p.category.name}</Link>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Gallery images={p.images} name={p.name} />
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {p.isSample && <SampleBadge />}
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted">{p.category.name}</span>
          </div>
          <h1 className="font-display text-3xl leading-tight sm:text-[2.6rem]">{p.name}</h1>
          <p className="mt-3 text-[15px] text-charcoal/75">{p.shortDescription}</p>
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-2xl font-semibold">{pricing.price(p.priceUsdCents)}</span>
            {p.compareAtUsdCents && p.compareAtUsdCents > p.priceUsdCents && (
              <span className="text-muted line-through">{pricing.price(p.compareAtUsdCents)}</span>
            )}
          </div>
          {pricing.currency === "NGN" && (
            <p className="mt-1 text-xs text-muted">Converted from USD at ₦{pricing.rate.toLocaleString("en-NG", { maximumFractionDigits: 2 })} / $1</p>
          )}
          <p className={`mt-4 flex items-center gap-2 text-sm ${p.stock <= 0 ? "text-danger" : low ? "text-[#9a6a1c]" : "text-olive"}`}>
            <span className={`h-2 w-2 rounded-full ${p.stock <= 0 ? "bg-danger" : low ? "bg-gold" : "bg-olive"}`} />
            {p.stock <= 0 ? "Out of stock" : low ? `Only ${p.stock} left` : "In stock — ready to ship"}
          </p>
          <div className="mt-7">
            <AddToCart productId={p.id} max={Math.min(20, p.stock)} disabled={p.stock <= 0} />
          </div>
          <ul className="mt-8 grid gap-3 border-y border-line py-6 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-2.5"><Icon name="truck" className="h-4 w-4 text-olive" /> Free Nigeria delivery over $250</li>
            <li className="flex items-center gap-2.5"><Icon name="lock" className="h-4 w-4 text-olive" /> Secure card checkout</li>
            <li className="flex items-center gap-2.5"><Icon name="package" className="h-4 w-4 text-olive" /> SKU {p.sku}</li>
            {p.material && <li className="flex items-center gap-2.5"><Icon name="leaf" className="h-4 w-4 text-olive" /> {p.material}</li>}
          </ul>
          <div className="mt-8 space-y-6">
            <section>
              <h2 className="eyebrow mb-3">Description</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-charcoal/80">{p.description}</p>
            </section>
            {p.features.length > 0 && (
              <section>
                <h2 className="eyebrow mb-3">Features</h2>
                <ul className="space-y-2 text-[15px] text-charcoal/80">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{f}</li>
                  ))}
                </ul>
              </section>
            )}
            {p.isSample && (
              <p className="rounded-xl bg-sand p-4 text-xs leading-relaxed text-muted">
                This is a sample listing used while the store is in development. Specifications, pricing and images are placeholders and do not represent a real supplier product.
              </p>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 font-display text-3xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} p={r} pricing={pricing} />)}
          </div>
        </section>
      )}
    </div>
  );
}
