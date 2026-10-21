import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Collections" };
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      products: { where: { isActive: true }, take: 1, orderBy: { isFeatured: "desc" }, select: { images: true } },
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
  return (
    <div className="container-x py-12 sm:py-16">
      <p className="eyebrow mb-3">Collections</p>
      <h1 className="font-display text-4xl sm:text-5xl">Everything for the considered kitchen</h1>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link key={c.id} href={`/shop?category=${c.slug}`} className="group card overflow-hidden">
            <div className="relative aspect-[4/3] bg-sand">
              {c.products[0]?.images[0] && <Image src={c.products[0].images[0]} alt="" fill unoptimized className="object-cover transition duration-500 group-hover:scale-105" />}
            </div>
            <div className="p-6">
              <h2 className="font-display text-2xl group-hover:text-olive">{c.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-olive">{c._count.products} products →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
