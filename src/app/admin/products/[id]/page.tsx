import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProductForm } from "../ProductForm";
import { ActionForm, FieldError, Submit } from "@/components/admin/ActionForm";
import { adjustStockAction } from "@/app/actions/admin";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const [product, categories, movements] = await Promise.all([
    db.product.findUnique({ where: { id } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.inventoryMovement.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  if (!product) notFound();
  return (
    <div className="space-y-6">
      <Link href="/admin/products" className="text-sm text-olive">← Products</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">{product.name}</h1>
        <Link href={`/product/${product.slug}`} className="text-sm text-olive" target="_blank">View in store ↗</Link>
      </div>
      {saved && <p role="status" className="rounded-lg bg-olive/10 p-3 text-sm text-olive">Product saved.</p>}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ProductForm product={product} categories={categories} />
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-display text-xl">Stock</h2>
            <p className="mt-1 font-display text-4xl">{product.stock}</p>
            <ActionForm action={adjustStockAction} className="mt-4 space-y-3">
              <input type="hidden" name="productId" value={product.id} />
              <div>
                <label className="label" htmlFor="adj">Adjust by (+/−)</label>
                <input id="adj" name="change" type="number" step={1} className="input" placeholder="e.g. 10 or -2" />
                <FieldError name="change" />
              </div>
              <div>
                <label className="label" htmlFor="why">Reason</label>
                <input id="why" name="reason" className="input" placeholder="Delivery received, damaged, recount…" />
                <FieldError name="reason" />
              </div>
              <Submit>Adjust stock</Submit>
            </ActionForm>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-display text-xl">Stock history</h2>
            <ul className="divide-y divide-line text-sm">
              {movements.map((m) => (
                <li key={m.id} className="flex justify-between gap-3 py-2">
                  <span>{m.reason}<span className="block text-xs text-muted">{m.createdAt.toLocaleString("en-GB")}</span></span>
                  <span className={m.change < 0 ? "text-danger" : "text-olive"}>{m.change > 0 ? "+" : ""}{m.change}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
