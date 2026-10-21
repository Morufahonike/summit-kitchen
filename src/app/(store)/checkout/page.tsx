import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSelectedCurrency } from "@/lib/currency";
import { paymentMode, usdChargingEnabled } from "@/lib/payments";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [user, currency] = await Promise.all([getCurrentUser(), getSelectedCurrency()]);
  const address = user ? await db.address.findFirst({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }) : null;
  let mode: string;
  try { mode = paymentMode(); } catch { mode = "unavailable"; }

  return (
    <div className="container-x py-10 sm:py-14">
      <h1 className="font-display text-4xl sm:text-5xl">Checkout</h1>
      {mode !== "live" && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold/15 px-4 py-1.5 text-xs font-semibold text-[#7a5a1d]">
          {mode === "mock" ? "Development mode — payments are simulated, no card is charged" : mode === "test" ? "Paystack TEST mode — use Paystack test cards only" : "Payments unavailable"}
        </p>
      )}
      <CheckoutForm
        signedIn={!!user}
        defaults={{
          email: user?.email ?? "",
          fullName: address?.fullName ?? user?.name ?? "",
          phone: address?.phone ?? user?.phone ?? "",
          line1: address?.line1 ?? "",
          line2: address?.line2 ?? "",
          city: address?.city ?? "",
          state: address?.state ?? "",
          postalCode: address?.postalCode ?? "",
          country: address?.country ?? "NG",
        }}
        chargeNotice={currency === "USD" && !usdChargingEnabled()}
      />
    </div>
  );
}
