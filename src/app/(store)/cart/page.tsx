import type { Metadata } from "next";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="container-x py-10 sm:py-14">
      <h1 className="mb-8 font-display text-4xl sm:text-5xl">Your cart</h1>
      <CartView />
    </div>
  );
}
