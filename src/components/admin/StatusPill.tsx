const tone: Record<string, string> = {
  PENDING_PAYMENT: "bg-taupe/50 text-charcoal",
  PAID: "bg-gold/25 text-[#6b4f17]",
  PROCESSING: "bg-sage/20 text-olive",
  SHIPPED: "bg-olive/15 text-olive",
  DELIVERED: "bg-olive text-ivory",
  CANCELLED: "bg-charcoal/10 text-charcoal",
  PAYMENT_FAILED: "bg-danger/10 text-danger",
  EXPIRED: "bg-charcoal/10 text-muted",
  NEEDS_REVIEW: "bg-danger text-white",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone[status] ?? "bg-sand"}`}>{label}</span>;
}
