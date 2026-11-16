"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Trophy, Plus, Swords, UserRound, Flag, Users, Settings } from "lucide-react";

export interface NavProps { meHref: string; attention: number }
const isOn = (path: string, href: string) => (href === "/home" ? path === "/home" : path === href || path.startsWith(`${href}/`) || (href.startsWith("/players/") && path === href));

/** Phones: five tabs with Record (the ball) in the thumb-reach center. */
export function TabBar({ meHref, attention }: NavProps) {
  const path = usePathname();
  const tabs = [
    { href: "/home", label: "Home", icon: House, dot: attention > 0 },
    { href: "/rankings", label: "Rankings", icon: Trophy },
    null,
    { href: "/h2h", label: "H2H", icon: Swords },
    { href: meHref, label: "Me", icon: UserRound },
  ];
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
        {tabs.map((t, i) => t === null ? (
          <li key="record" className="flex justify-center">
            <Link href="/record" aria-label="Record a match" className="press -mt-7 grid size-14 place-items-center rounded-full bg-ball text-on-ball shadow-[0_6px_20px_-6px_rgb(214_242_74/0.7)] ring-4 ring-bg">
              <Plus size={26} strokeWidth={2.75} aria-hidden="true" />
            </Link>
          </li>
        ) : (
          <li key={t.href}>
            <Link href={t.href} aria-current={isOn(path, t.href) ? "page" : undefined}
              className={`press relative flex h-14 flex-col items-center justify-center gap-0.5 text-micro font-semibold ${isOn(path, t.href) ? "text-text" : "text-text-3"}`}>
              <t.icon size={22} strokeWidth={isOn(path, t.href) ? 2.4 : 1.9} aria-hidden="true" />
              {t.label}
              {t.dot ? <><span className="absolute top-2 right-[calc(50%-16px)] size-2 rounded-full bg-clay ring-2 ring-surface" aria-hidden="true" /><span className="sr-only">, {attention} waiting for you</span></> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Desktop: a slim left rail. */
export function Rail({ meHref, attention }: NavProps) {
  const path = usePathname();
  const items = [
    { href: "/home", label: "Home", icon: House, count: attention },
    { href: "/rankings", label: "Rankings", icon: Trophy },
    { href: "/h2h", label: "Head to head", icon: Swords },
    { href: "/challenges", label: "Challenges", icon: Flag },
    { href: "/players", label: "Players", icon: Users },
    { href: meHref, label: "My profile", icon: UserRound },
  ];
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1">
      <Link href="/record" className="press mb-5 flex h-12 items-center justify-center gap-2 rounded-full bg-ball font-bold text-on-ball">
        <Plus size={20} strokeWidth={2.75} aria-hidden="true" />Record match
      </Link>
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={isOn(path, it.href) ? "page" : undefined}
          className={`press flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isOn(path, it.href) ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-3 hover:text-text"}`}>
          <it.icon size={19} strokeWidth={isOn(path, it.href) ? 2.4 : 1.9} aria-hidden="true" />{it.label}
          {it.count ? <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1.5 text-micro font-bold text-on-ball">{it.count}</span> : null}
        </Link>
      ))}
      <Link href="/settings" aria-current={path === "/settings" ? "page" : undefined}
        className={`press mt-auto flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${path === "/settings" ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-3 hover:text-text"}`}>
        <Settings size={19} aria-hidden="true" />Settings
      </Link>
    </nav>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="12" fill="var(--ball)" /><path d="M5 5.5c4.2 3.6 4.2 11.4 0 15M21 5.5c-4.2 3.6-4.2 11.4 0 15" fill="none" stroke="var(--on-ball)" strokeWidth="1.6" strokeLinecap="round" /></svg>
      <span className="display text-xl">Baseline</span>
    </span>
  );
}
