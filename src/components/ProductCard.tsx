import Image from "next/image";
import Link from "next/link";
import type { Pricing } from "@/lib/pricing";
import { SampleBadge } from "./SampleBadge";

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  images: string[];
  priceUsdCents: number;
  compareAtUsdCents: number | null;
  stock: number;
  isSample: boolean;
  material: string | null;
  category?: { name: string } | null;
};

export function ProductCard({ p, pricing, priority = false }: { p: CardProduct; pricing: Pricing; priority?: boolean }) {
  const out = p.stock <= 0;
  return (
    <article className="group relative">
      <Link href={`/product/${p.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-sand">
          {p.images[0] && (
            <Image
              src={p.images[0]}
              alt={p.name}
              fill
              sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              priority={priority}
              unoptimized={p.images[0].endsWith(".svg")}
            />
          )}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {p.isSample && <SampleBadge />}
            {out && <span className="rounded-full bg-charcoal px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ivory">Sold out</span>}
            {!out && p.compareAtUsdCents && p.compareAtUsdCents > p.priceUsdCents && (
              <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal">Offer</span>
            )}
          </div>
        </div>
        <div className="mt-3.5 space-y-1 px-0.5">
          {p.category && <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{p.category.name}</p>}
          <h3 className="font-display text-[17px] leading-snug text-charcoal group-hover:text-olive">{p.name}</h3>
          <p className="flex items-baseline gap-2 text-sm">
            <span className="font-semibold">{pricing.price(p.priceUsdCents)}</span>
            {p.compareAtUsdCents && p.compareAtUsdCents > p.priceUsdCents && (
              <span className="text-muted line-through">{pricing.price(p.compareAtUsdCents)}</span>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
