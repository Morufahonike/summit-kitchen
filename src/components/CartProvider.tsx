"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { productId: string; quantity: number };

type CartCtx = {
  items: CartItem[];
  count: number;
  ready: boolean;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  replace: (items: CartItem[]) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "sk_cart_v1";
const MAX_QTY = 20;

function sanitize(v: unknown): CartItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((i): i is CartItem => !!i && typeof i.productId === "string" && Number.isInteger(i.quantity))
    .map((i) => ({ productId: i.productId.slice(0, 40), quantity: Math.max(1, Math.min(MAX_QTY, i.quantity)) }))
    .slice(0, 50);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setItems(sanitize(JSON.parse(localStorage.getItem(KEY) ?? "[]")));
    } catch {
      /* storage unavailable — cart stays in memory */
    }
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        try { setItems(sanitize(JSON.parse(e.newValue ?? "[]"))); } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ }
  }, [items, ready]);

  const add = useCallback((productId: string, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.productId === productId);
      if (found) return prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i));
      return [...prev, { productId, quantity: Math.min(MAX_QTY, quantity) }];
    });
  }, []);
  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : i)));
  }, []);
  const remove = useCallback((productId: string) => setItems((prev) => prev.filter((i) => i.productId !== productId)), []);
  const replace = useCallback((next: CartItem[]) => setItems(sanitize(next)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, ready, count: items.reduce((s, i) => s + i.quantity, 0), add, setQuantity, remove, replace, clear }),
    [items, ready, add, setQuantity, remove, replace, clear],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
