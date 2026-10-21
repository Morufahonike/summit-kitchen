import type { Metadata, Viewport } from "next";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/montserrat";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  title: { default: "Summit Kitchen — Elevating the art of everyday living", template: "%s · Summit Kitchen" },
  description: "Premium kitchen and homeware products designed for modern living. Cookware, knives, appliances, storage and accessories.",
  robots: { index: false, follow: false }, // development build — remove at launch
};

export const viewport: Viewport = { themeColor: "#FAF8F2", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
