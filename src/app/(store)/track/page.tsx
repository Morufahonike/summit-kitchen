import type { Metadata } from "next";
import { TrackForm } from "./TrackForm";

export const metadata: Metadata = { title: "Track your order" };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <div className="container-x max-w-3xl py-12 sm:py-16">
      <p className="eyebrow mb-3">Order tracking</p>
      <h1 className="font-display text-4xl sm:text-5xl">Where&rsquo;s my order?</h1>
      <p className="mt-3 text-muted">Enter your order number and the email you used at checkout.</p>
      <TrackForm defaultOrder={typeof order === "string" ? order.slice(0, 30) : ""} />
    </div>
  );
}
