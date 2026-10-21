import Link from "next/link";
import type { Metadata } from "next";
import { LogoMark } from "@/components/Logo";
import { SHIPPING_METHODS } from "@/lib/shipping";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container-x max-w-4xl py-14 sm:py-20">
      <LogoMark className="h-8 w-auto" />
      <p className="eyebrow mt-6 mb-3">About Summit Kitchen</p>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Elevating the art of everyday living</h1>
      <p className="mt-6 text-lg leading-relaxed text-charcoal/80">
        Summit Kitchen Services Limited manufactures, processes, repairs and trades in a wide range of kitchen appliances and products. We bring together dependable tools and refined design so that cooking at home feels calmer, more capable and more beautiful.
      </p>
      <div className="mt-14 grid gap-6 sm:grid-cols-3">
        {[
          ["Quality", "Materials and construction chosen to last for years of daily use."],
          ["Functionality", "Every piece earns its place on the counter or in the drawer."],
          ["Elegance", "A calm, natural palette that suits modern homes."],
        ].map(([t, b]) => (
          <div key={t} className="card p-6">
            <span className="block h-px w-8 bg-gold" />
            <h2 className="mt-4 font-display text-2xl">{t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{b}</p>
          </div>
        ))}
      </div>
      <section id="services" className="mt-16 scroll-mt-28">
        <h2 className="font-display text-3xl">Repairs & servicing</h2>
        <p className="mt-4 leading-relaxed text-charcoal/80">
          Alongside retail, our service team repairs and maintains kitchen appliances. Online booking is not yet available — please contact us with the appliance make, model and fault description.
        </p>
      </section>
      <section id="shipping" className="mt-16 scroll-mt-28">
        <h2 className="font-display text-3xl">Shipping & returns</h2>
        <p className="mt-2 text-xs uppercase tracking-wider text-gold">Provisional — to be confirmed before launch</p>
        <ul className="mt-5 divide-y divide-line border-y border-line text-sm">
          {Object.values(SHIPPING_METHODS).map((m) => (
            <li key={m.label} className="flex justify-between py-3"><span>{m.label}</span><span className="text-muted">{m.eta}</span></li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">Returns policy to be confirmed by Summit Kitchen Services Limited.</p>
      </section>
      <Link href="/shop" className="btn-gold mt-14">Shop the collection</Link>
    </div>
  );
}
