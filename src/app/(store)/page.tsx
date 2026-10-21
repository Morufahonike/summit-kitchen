import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getPricing } from "@/lib/pricing";
import { ProductCard } from "@/components/ProductCard";
import { Icon, type IconName } from "@/components/Icon";
import { LogoMark } from "@/components/Logo";

export const dynamic = "force-dynamic";

const trust: { icon: IconName; title: string; body: string }[] = [
  { icon: "award", title: "Premium Quality", body: "Built to last" },
  { icon: "leaf", title: "Curated Collections", body: "For every home" },
  { icon: "truck", title: "Fast & Reliable Delivery", body: "Across Nigeria & beyond" },
  { icon: "shield", title: "Secure Payments", body: "Mastercard, Visa & Verve" },
];

export default async function HomePage() {
  const [pricing, featured, categories] = await Promise.all([
    getPricing(),
    db.product.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { createdAt: "asc" },
      take: 8,
      include: { category: { select: { name: true } } },
    }),
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { products: { where: { isActive: true }, take: 1, orderBy: { isFeatured: "desc" }, select: { images: true } }, _count: { select: { products: { where: { isActive: true } } } } },
    }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-x grid items-center gap-10 py-10 md:grid-cols-[1fr_1.15fr] md:py-16 lg:py-20">
          <div className="order-2 md:order-1">
            <p className="eyebrow mb-5">Summit Kitchen Services Limited</p>
            <h1 className="font-display text-[2.6rem] leading-[1.05] text-charcoal sm:text-6xl lg:text-[4.4rem]">
              Elevate Your <br className="hidden sm:block" />
              Everyday Living
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-charcoal/75">
              Premium kitchen and homeware for modern homes — thoughtfully curated for quality, functionality and timeless elegance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn-gold">
                Shop the Collection <Icon name="chevronRight" className="h-4 w-4" />
              </Link>
              <Link href="/collections" className="btn-outline">Browse categories</Link>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-sand shadow-[0_30px_60px_-30px_rgba(47,59,42,.35)]">
              <Image src="/brand/hero.svg" alt="A deep green Dutch oven, stoneware bowls and olive-wood utensils on a warm ivory counter" fill priority unoptimized className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section aria-label="Why Summit Kitchen" className="border-y border-line bg-white/60">
        <div className="container-x grid grid-cols-2 gap-y-6 py-7 lg:grid-cols-4">
          {trust.map((t) => (
            <div key={t.title} className="flex items-center gap-3.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/50 text-olive">
                <Icon name={t.icon} />
              </span>
              <div>
                <p className="text-[13px] font-semibold">{t.title}</p>
                <p className="text-xs text-muted">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container-x pt-20">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow mb-3">Collections</p>
            <h2 className="font-display text-3xl sm:text-4xl">Shop by category</h2>
          </div>
          <Link href="/collections" className="text-sm font-semibold text-olive hover:underline">View all collections →</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {categories.slice(0, 7).map((c, i) => (
            <Link
              key={c.id}
              href={`/shop?category=${c.slug}`}
              className={`group relative overflow-hidden rounded-2xl bg-sand ${i === 0 ? "col-span-2 row-span-2 aspect-square lg:aspect-auto" : "aspect-square"}`}
            >
              {c.products[0]?.images[0] && (
                <Image src={c.products[0].images[0]} alt="" fill unoptimized className="object-cover transition duration-500 group-hover:scale-105" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/70 via-charcoal/20 to-transparent p-4 sm:p-5">
                <h3 className={`font-display text-ivory ${i === 0 ? "text-2xl sm:text-3xl" : "text-lg"}`}>{c.name}</h3>
                <p className="text-xs text-ivory/80">{c._count.products} products</p>
              </div>
            </Link>
          ))}
          <Link href="/about#services" className="flex aspect-square flex-col justify-between rounded-2xl bg-forest p-5 text-ivory">
            <LogoMark tone="light" className="h-6 w-auto self-start" />
            <div>
              <h3 className="font-display text-lg">Repairs & servicing</h3>
              <p className="mt-1 text-xs text-ivory/75">Appliance repairs and maintenance from our service team.</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured */}
      <section className="container-x pt-24">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-3">Curated for you</p>
          <h2 className="font-display text-3xl sm:text-4xl">Thoughtful kitchen essentials</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
          {featured.map((p, i) => (
            <ProductCard key={p.id} p={p} pricing={pricing} priority={i < 4} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/shop" className="btn-outline">View all products</Link>
        </div>
      </section>

      {/* Brand values */}
      <section className="container-x pt-24">
        <div className="grid overflow-hidden rounded-[28px] bg-sand md:grid-cols-2">
          <div className="flex flex-col justify-center p-8 sm:p-14">
            <LogoMark className="mb-6 h-7 w-auto self-start" />
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">Elevating the art of everyday living</h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-charcoal/75">
              We manufacture, source, repair and supply kitchen appliances and homeware chosen for how they perform and how they feel in the hand — pieces that make daily cooking calmer and more beautiful.
            </p>
            <Link href="/about" className="mt-8 self-start text-sm font-semibold text-olive hover:underline">Our story →</Link>
          </div>
          <div className="grid grid-cols-2 gap-px bg-line">
            {["Quality", "Functionality", "Elegance", "Modern Living"].map((v) => (
              <div key={v} className="flex aspect-square flex-col items-center justify-center bg-ivory p-6 text-center">
                <span className="mb-3 h-px w-8 bg-gold" />
                <p className="font-display text-xl sm:text-2xl">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
