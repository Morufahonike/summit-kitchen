const STEPS = [
  { key: "PAID", label: "Payment confirmed" },
  { key: "PROCESSING", label: "Being prepared" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];
const RANK: Record<string, number> = { PENDING_PAYMENT: -1, PAID: 0, NEEDS_REVIEW: 0, PROCESSING: 1, SHIPPED: 2, DELIVERED: 3 };

export function OrderTimeline({ statusKey, events }: { statusKey: string; events: { status: string; message: string; at: string }[] }) {
  const terminal = ["CANCELLED", "PAYMENT_FAILED", "EXPIRED"].includes(statusKey);
  const rank = RANK[statusKey] ?? -1;
  return (
    <div className="mt-8">
      {!terminal && (
        <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className="text-center">
              <div className={`h-1.5 rounded-full ${i <= rank ? "bg-olive" : "bg-line"}`} />
              <p className={`mt-2 text-[11px] leading-tight sm:text-xs ${i <= rank ? "font-semibold text-charcoal" : "text-muted"}`}>{s.label}</p>
            </li>
          ))}
        </ol>
      )}
      <ul className="mt-6 space-y-3 text-sm">
        {[...events].reverse().map((e, i) => (
          <li key={i} className="flex gap-3">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i === 0 ? "bg-gold" : "bg-taupe"}`} />
            <div>
              <p className="font-medium">{e.message}</p>
              <p className="text-xs text-muted">{new Date(e.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
