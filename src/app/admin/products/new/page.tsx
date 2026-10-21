import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "New product" };

export default async function NewProduct() {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/products" className="text-sm text-olive">← Products</Link>
      <h1 className="font-display text-3xl">New product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}
