import { ActionForm, FieldError, Submit } from "@/components/admin/ActionForm";
import { saveProductAction } from "@/app/actions/admin";

type P = {
  id: string; name: string; slug: string; sku: string; shortDescription: string; description: string; brand: string;
  material: string | null; priceUsdCents: number; compareAtUsdCents: number | null; lowStockThreshold: number;
  categoryId: string; images: string[]; features: string[]; isActive: boolean; isFeatured: boolean; isSample: boolean;
};

export function ProductForm({ product, categories }: { product?: P; categories: { id: string; name: string }[] }) {
  const p = product;
  const input = (name: string, label: string, def: string | number | undefined, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`pf-${name}`}>{label}</label>
      <input id={`pf-${name}`} name={name} defaultValue={def} className="input" {...props} />
      <FieldError name={name} />
    </div>
  );
  return (
    <ActionForm action={saveProductAction} className="card space-y-5 p-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">{input("name", "Name", p?.name, { required: true })}</div>
        {input("slug", "URL slug", p?.slug, { required: true, pattern: "[a-z0-9-]+", placeholder: "lowercase-with-hyphens" })}
        {input("sku", "SKU", p?.sku, { required: true })}
        {input("priceUsd", "Price (USD)", p ? p.priceUsdCents / 100 : undefined, { type: "number", step: "0.01", min: "0.01", required: true })}
        {input("compareAtUsd", "Compare-at price (USD, optional)", p?.compareAtUsdCents ? p.compareAtUsdCents / 100 : "", { type: "number", step: "0.01", min: "0" })}
        {input("brand", "Brand", p?.brand ?? "Summit Kitchen")}
        {input("material", "Material", p?.material ?? "")}
        <div>
          <label className="label" htmlFor="pf-cat">Category</label>
          <select id="pf-cat" name="categoryId" defaultValue={p?.categoryId} className="input" required>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <FieldError name="categoryId" />
        </div>
        {input("lowStockThreshold", "Low-stock alert at", p?.lowStockThreshold ?? 5, { type: "number", min: 0 })}
        {!p && input("initialStock", "Initial stock", 0, { type: "number", min: 0 })}
      </div>
      {input("shortDescription", "Short description", p?.shortDescription, { required: true, maxLength: 200 })}
      <div>
        <label className="label" htmlFor="pf-desc">Description</label>
        <textarea id="pf-desc" name="description" rows={5} defaultValue={p?.description} className="input" required />
        <FieldError name="description" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pf-img">Image URLs (one per line)</label>
          <textarea id="pf-img" name="images" rows={3} defaultValue={p?.images.join("\n")} className="input font-mono text-xs" placeholder="/samples/… or https://…" />
          <FieldError name="images" />
          <p className="mt-1 text-xs text-muted">Only use images you have the rights to. Remote hosts must be allow-listed in next.config.</p>
        </div>
        <div>
          <label className="label" htmlFor="pf-feat">Features (one per line)</label>
          <textarea id="pf-feat" name="features" rows={3} defaultValue={p?.features.join("\n")} className="input" />
        </div>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={p?.isActive ?? true} className="accent-olive" /> Visible in store</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" defaultChecked={p?.isFeatured ?? false} className="accent-olive" /> Featured on homepage</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isSample" defaultChecked={p?.isSample ?? true} className="accent-olive" /> Sample (placeholder) product</label>
      </div>
      <Submit>{p ? "Save changes" : "Create product"}</Submit>
    </ActionForm>
  );
}
