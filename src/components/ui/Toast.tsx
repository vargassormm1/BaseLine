"use client";
import { useEffect, useState } from "react";
import { Check, CircleAlert } from "lucide-react";

type Toast = { id: number; ok: boolean; text: string };
const listeners = new Set<(t: Toast) => void>();
let n = 0;
/** Show a short message that outlives the component that triggered it (e.g. a card that disappears on confirm). */
export function toast(text: string, ok = true) { const t = { id: ++n, ok, text }; listeners.forEach((l) => l(t)); }

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const on = (t: Toast) => { setItems((xs) => [...xs, t]); setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 3500); };
    listeners.add(on); return () => { listeners.delete(on); };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-8">
      {items.map((t) => (
        <p key={t.id} role={t.ok ? "status" : "alert"} className="animate-rise pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-text px-4 py-2.5 text-sm font-semibold text-bg shadow-lg">
          {t.ok ? <Check size={16} strokeWidth={3} className="shrink-0 text-accent" aria-hidden="true" /> : <CircleAlert size={16} className="shrink-0 text-loss" aria-hidden="true" />}{t.text}
        </p>
      ))}
    </div>
  );
}
