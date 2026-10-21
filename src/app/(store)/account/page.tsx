import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { CUSTOMER_STATUS_LABEL } from "@/lib/orders";
import { logoutAction } from "@/app/actions/auth";
import { Icon } from "@/components/Icon";
import { ProfileForms } from "./ProfileForms";

export const metadata: Metadata = { title: "My account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [orders, address] = await Promise.all([
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { _count: { select: { items: true } } } }),
    db.address.findFirst({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }),
  ]);
  return (
    <div className="container-x py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">My account</p>
          <h1 className="font-display text-4xl">Hello, {user.name.split(" ")[0]}</h1>
        </div>
        <div className="flex gap-2">
          {user.role === "ADMIN" && <Link href="/admin" className="btn-primary py-2.5">Admin dashboard</Link>}
          <form action={logoutAction}><button className="btn-outline py-2.5"><Icon name="logout" className="h-4 w-4" /> Sign out</button></form>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="mb-4 font-display text-2xl">Orders</h2>
          {orders.length === 0 ? (
            <div className="card p-8 text-center text-sm text-muted">
              No orders yet. <Link href="/shop" className="font-semibold text-olive underline">Start shopping</Link>
            </div>
          ) : (
            <ul className="card divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/account/orders/${o.number}`} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-ivory">
                    <div>
                      <p className="font-semibold">{o.number}</p>
                      <p className="text-xs text-muted">{o.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" })} · {o._count.items} item{o._count.items === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="rounded-full bg-sand px-3 py-1 text-xs font-medium">{CUSTOMER_STATUS_LABEL[o.status]}</span>
                      <span className="font-semibold">{formatMoney(o.total, o.currency)}</span>
                      <Icon name="chevronRight" className="h-4 w-4 text-muted" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">Orders placed as a guest can be tracked from the <Link href="/track" className="underline">order tracking page</Link>.</p>
        </section>
        <ProfileForms
          user={{ name: user.name, email: user.email, phone: user.phone ?? "" }}
          address={address ? { fullName: address.fullName, line1: address.line1, line2: address.line2 ?? "", city: address.city, state: address.state, postalCode: address.postalCode ?? "", country: address.country } : null}
        />
      </div>
    </div>
  );
}
