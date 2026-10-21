import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActionForm, Submit } from "@/components/admin/ActionForm";
import { setUserRoleAction } from "@/app/actions/admin";

export const metadata = { title: "Customers" };

export default async function AdminCustomers() {
  const me = await requireAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { orders: true } } },
  });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Customers</h1>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-ivory text-left text-xs uppercase tracking-wider text-muted"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3">Role</th></tr></thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5">{u.name}<span className="block text-xs text-muted">{u.email}</span></td>
                <td className="px-4 py-2.5 text-muted">{u.createdAt.toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-2.5 text-right">{u._count.orders}</td>
                <td className="px-4 py-2.5">
                  {u.id === me.id ? (
                    <span className="text-xs font-semibold">ADMIN (you)</span>
                  ) : (
                    <ActionForm action={setUserRoleAction} className="flex items-center gap-2" confirm={`Change the role of ${u.email}?`}>
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="role" defaultValue={u.role} className="input w-auto py-1.5 text-xs">
                        <option value="CUSTOMER">Customer</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <Submit className="btn-outline px-3 py-1.5 text-xs">Set</Submit>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
