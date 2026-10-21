export function SampleBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`rounded-full border border-charcoal/10 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal ${className}`}
      title="Placeholder product for development — not a real listing"
    >
      Sample
    </span>
  );
}
