import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUsdNgnRate } from "@/lib/fx";
import { paymentMode, providerName, usdChargingEnabled } from "@/lib/payments";
import { ActionForm, FieldError, Submit } from "@/components/admin/ActionForm";
import { clearManualRateAction, refreshRateAction, setManualRateAction } from "@/app/actions/admin";

export const metadata = { title: "Settings" };

export default async function AdminSettings() {
  await requireAdmin();
  const [fx, logs] = await Promise.all([
    getUsdNgnRate(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { email: true } } } }),
  ]);
  let provider = "unconfigured", mode = "unconfigured";
  try { provider = providerName(); mode = paymentMode(); } catch (e) { mode = (e as Error).message; }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Settings</h1>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card space-y-4 p-5">
          <h2 className="font-display text-xl">Exchange rate (USD → NGN)</h2>
          <p className="font-display text-4xl">₦{fx.rate.toLocaleString("en-NG", { maximumFractionDigits: 2 })}</p>
          <p className="text-sm text-muted">
            Source: {fx.source}{fx.isManual && " (manual override)"} · {fx.fetchedAt.getTime() === 0 ? "fallback value" : fx.fetchedAt.toLocaleString("en-GB")}
            {fx.stale && <span className="ml-1 font-semibold text-danger">· STALE — live feed unreachable</span>}
          </p>
          <ActionForm action={setManualRateAction} className="flex flex-wrap items-start gap-2">
            <div>
              <input name="rate" type="number" step="0.01" placeholder="e.g. 1530" className="input w-40" />
              <FieldError name="rate" />
            </div>
            <Submit>Set manual rate</Submit>
          </ActionForm>
          <div className="flex flex-wrap gap-2">
            {fx.isManual && <ActionForm action={clearManualRateAction}><Submit className="btn-outline py-2 text-xs">Remove manual override</Submit></ActionForm>}
            <ActionForm action={refreshRateAction}><Submit className="btn-outline py-2 text-xs">Refresh automatic rate</Submit></ActionForm>
          </div>
          <p className="text-xs text-muted">The rate is locked into each order at checkout, so changing it never alters existing orders.</p>
        </section>
        <section className="card space-y-3 p-5 text-sm">
          <h2 className="font-display text-xl">Payments</h2>
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-muted">Provider</dt><dd className="font-semibold">{provider}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Mode</dt><dd className="font-semibold">{mode}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Charge in USD</dt><dd className="font-semibold">{usdChargingEnabled() ? "Enabled" : "Off — USD shoppers pay NGN equivalent"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Live keys allowed</dt><dd className="font-semibold">{process.env.ALLOW_LIVE_PAYMENTS === "true" ? "Yes" : "No (blocked)"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Webhook URL</dt><dd className="font-mono text-xs">{(process.env.APP_URL ?? "").replace(/\/$/, "")}/api/paystack/webhook</dd></div>
          </dl>
          <p className="text-xs text-muted">Payment settings are controlled by server environment variables and cannot be changed from this screen. Going live requires owner approval.</p>
        </section>
      </div>
      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 font-display text-xl">Admin activity log</h2>
        <table className="w-full min-w-[560px] text-sm">
          <tbody className="divide-y divide-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="py-2 pr-4 text-muted">{l.createdAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="py-2 pr-4">{l.actor?.email ?? "—"}</td>
                <td className="py-2 pr-4 font-mono text-xs">{l.action}</td>
                <td className="py-2 text-xs text-muted">{l.details ? JSON.stringify(l.details) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
