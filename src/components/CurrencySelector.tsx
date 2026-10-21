"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CurrencyCode } from "@/lib/money";
import { setCurrencyAction } from "@/app/actions/currency";

export function CurrencySelector({ current, compact = false }: { current: CurrencyCode; compact?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={`inline-flex items-center rounded-full border border-line bg-white p-0.5 text-xs font-semibold ${pending ? "opacity-60" : ""}`} role="group" aria-label="Currency">
      {(["USD", "NGN"] as const).map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={current === c}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setCurrencyAction(c);
              router.refresh();
            })
          }
          className={`rounded-full px-2.5 py-1 transition ${current === c ? "bg-charcoal text-ivory" : "text-charcoal/70 hover:text-charcoal"}`}
        >
          {compact ? (c === "USD" ? "$" : "₦") : c === "USD" ? "USD $" : "NGN ₦"}
        </button>
      ))}
    </div>
  );
}
