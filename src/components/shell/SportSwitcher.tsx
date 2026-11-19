"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { equivalentPath, SPORT_LIST, sportOfPath, type SportKey } from "@/lib/sports";

/** Restrained sport marks (no logos): a tennis ball's seams, a pickleball's holes. */
export function SportIcon({ sport, size = 16 }: { sport: SportKey; size?: number }) {
  return sport === "tennis" ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6c3.4 3.4 3.4 9.4 0 12.8M18.4 5.6c-3.4 3.4-3.4 9.4 0 12.8" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="12.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12.5" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Tennis | Pickleball. Goes to the same screen in the other sport; lights up the tapped sport at once. */
export function SportSwitcher({ fallback }: { fallback: SportKey }) {
  const path = usePathname();
  const current = sportOfPath(path) ?? fallback;
  const [tapped, setTapped] = useState<SportKey | null>(null);
  useEffect(() => { setTapped(null); }, [path]);
  const active = tapped ?? current;
  return (
    <nav aria-label="Sport" className="inline-grid grid-cols-2 rounded-full border border-line bg-surface-2 p-1">
      {SPORT_LIST.map((s) => {
        const on = s.key === active;
        return (
          <Link key={s.key} href={equivalentPath(path, s.key)} aria-current={on ? "page" : undefined} onClick={() => setTapped(s.key)}
            className={`press inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors ${on ? "bg-surface text-text shadow-sm ring-1 ring-line" : "text-text-2 hover:text-text"}`}>
            <SportIcon sport={s.key} size={16} />{s.label}
          </Link>
        );
      })}
    </nav>
  );
}
