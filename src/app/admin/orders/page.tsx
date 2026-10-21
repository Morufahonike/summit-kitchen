import Link from "next/link";
import type { Prisma, OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { CUSTOMER_STATUS_LABEL } from "@/lib/orders";
import { StatusPill } from "@/components/admin/StatusPill";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { expireOrdersAction } from "@/app/actions/admin";

export const metadata = { title: "Orders" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin();
  const { status, q } = await searchParams;
  const statuses = Object.keys(CUSTOMER_STATUS_LABEL) as OrderStatus[];
  const where: Prisma.OrderWhereInput = {};
  if (status && (statuses as string[]).includes(status)) where.status = status as OrderStatus;
  const query = q?.trim().slice(0, 80);
  if (query) where.OR = [{ number: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }, { shipFullName: { contains: query, mode: "insensitive" } }];
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { _count: { select: { items: true } } } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-3xl">Orders</h1>
        <ActionForm action={expireOrdersAction} className="text-right">
          <Submit className="btn-outline py-2 text-xs" pendingLabel="Checking…">Expire unpaid orders &gt; 60 min</Submit>
        </ActionForm>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={query} placeholder="Order no., email or name" className="input max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="input max-w-[200px]">
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{CUSTOMER_STATUS_LABEL[s]}</option>)}
        </select>
        <button className="btn-primary py-2.5">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ivory text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-ivory">
                <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-olive">{o.number}</Link><p className="text-xs text-muted">{o._count.items} items</p></td>
                <td className="px-4 py-3">{o.shipFullName}<p className="text-xs text-muted">{o.email}</p></td>
                <td className="px-4 py-3 text-muted">{o.createdAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-4 py-3"><StatusPill status={o.status} label={CUSTOMER_STATUS_LABEL[o.status]} /></td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(o.total, o.currency)}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
