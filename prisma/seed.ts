import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { categories, products } from "./sample-data";

const db = new PrismaClient();

async function main() {
  for (const [i, c] of categories.entries()) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, sortOrder: i },
      create: { slug: c.slug, name: c.name, description: c.description, sortOrder: i },
    });
  }
  const cats = new Map((await db.category.findMany()).map((c) => [c.slug, c.id]));

  for (const p of products) {
    const data = {
      sku: p.sku,
      name: p.name,
      shortDescription: p.short,
      description: p.description,
      material: p.material,
      priceUsdCents: Math.round(p.priceUsd * 100),
      compareAtUsdCents: p.compareAtUsd ? Math.round(p.compareAtUsd * 100) : null,
      images: [`/samples/${p.slug}.svg`, `/samples/${p.slug}-detail.svg`],
      features: p.features,
      isFeatured: !!p.featured,
      isSample: true,
      categoryId: cats.get(p.category)!,
    };
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      await db.product.update({ where: { id: existing.id }, data });
    } else {
      const created = await db.product.create({ data: { ...data, slug: p.slug, stock: p.stock } });
      if (p.stock > 0) {
        await db.inventoryMovement.create({ data: { productId: created.id, change: p.stock, reason: "Initial sample stock" } });
      }
    }
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12 || password.startsWith("replace-")) {
      throw new Error("SEED_ADMIN_PASSWORD must be a real password of at least 12 characters");
    }
    const exists = await db.user.findUnique({ where: { email } });
    if (!exists) {
      await db.user.create({
        data: { email, name: "Store Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
      });
      console.log(`Created admin ${email}`);
    } else {
      console.log(`Admin ${email} already exists — password unchanged`);
    }
  }
  console.log(`Seeded ${categories.length} categories and ${products.length} SAMPLE products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
