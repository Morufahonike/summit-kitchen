// Recreated from the Summit Kitchen brand board. Replace with the original vector logo file when supplied.

export function LogoMark({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const ink = tone === "dark" ? "#2C2C2C" : "#FAF8F2";
  return (
    <svg viewBox="0 0 96 50" className={className} aria-hidden="true" fill="none" strokeLinejoin="miter" strokeLinecap="square">
      <path d="M4 47 L36 13 L50 28 L62 16 L92 47" stroke={ink} strokeWidth="3.2" />
      <path d="M20 47 L42 23 L52 33 L62 24 L78 47" stroke="#C9A96A" strokeWidth="3.2" />
    </svg>
  );
}

export function Logo({
  variant = "stacked",
  tone = "dark",
  className = "",
}: {
  variant?: "stacked" | "horizontal";
  tone?: "dark" | "light";
  className?: string;
}) {
  const ink = tone === "dark" ? "text-charcoal" : "text-ivory";
  if (variant === "horizontal") {
    return (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        <LogoMark className="h-6 w-auto" tone={tone} />
        <span className={`font-display text-[19px] tracking-[0.14em] ${ink}`}>SUMMIT KITCHEN</span>
      </span>
    );
  }
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <LogoMark className="h-5 w-auto sm:h-6" tone={tone} />
      <span className={`mt-1 font-display text-[19px] tracking-[0.16em] sm:text-[22px] ${ink}`}>SUMMIT</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-[8px] font-medium tracking-[0.42em] text-gold sm:text-[9px]">
        <span className="h-px w-3 bg-gold/70" />KITCHEN<span className="h-px w-3 bg-gold/70" />
      </span>
    </span>
  );
}
