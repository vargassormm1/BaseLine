"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ListOrdered, Trophy, Plus, Swords, UserRound, Flag, Users, Settings } from "lucide-react";

export interface NavProps { meHref: string; attention: number }
/** Exactly one nav item is active: your own profile lights "Me", other players light "Players". */
const isOn = (path: string, href: string, meHref = "") =>
  href === "/players" ? path === "/players" || (path.startsWith("/players/") && path.toLowerCase() !== meHref.toLowerCase())
    : href.startsWith("/players/") ? path.toLowerCase() === href.toLowerCase()
    : path === href || path.startsWith(`${href}/`);

/** Phones: five tabs with Record (the round button) in the thumb-reach center. */
export function TabBar({ meHref, attention }: NavProps) {
  const path = usePathname();
  const tabs = [
    { href: "/home", label: "Home", icon: House, dot: attention > 0 },
    { href: "/matches", label: "Matches", icon: ListOrdered },
    null,
    { href: "/rankings", label: "Rankings", icon: Trophy },
    { href: meHref, label: "Me", icon: UserRound },
  ];
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
        {tabs.map((t, i) => t === null ? (
          <li key="record" className="flex justify-center">
            <Link href="/record" aria-label="Record a match" className="press -mt-7 grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-[0_8px_20px_-6px_rgb(66_99_235/0.65)] ring-4 ring-bg">
              <Plus size={26} strokeWidth={2.75} aria-hidden="true" />
            </Link>
          </li>
        ) : (
          <li key={t.href}>
            <Link href={t.href} aria-current={isOn(path, t.href, meHref) ? "page" : undefined}
              className={`press relative flex h-14 flex-col items-center justify-center gap-0.5 text-micro font-semibold ${isOn(path, t.href, meHref) ? "text-text" : "text-text-3"}`}>
              <t.icon size={22} strokeWidth={isOn(path, t.href, meHref) ? 2.4 : 1.9} aria-hidden="true" />
              {t.label}
              {t.dot ? <><span className="absolute top-2 right-[calc(50%-16px)] size-2 rounded-full bg-loss ring-2 ring-surface" aria-hidden="true" /><span className="sr-only">, {attention} waiting for you</span></> : null}
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
    { href: "/matches", label: "Matches", icon: ListOrdered },
    { href: "/rankings", label: "Rankings", icon: Trophy },
    { href: "/h2h", label: "Head to head", icon: Swords },
    { href: "/challenges", label: "Challenges", icon: Flag },
    { href: "/players", label: "Players", icon: Users },
    { href: meHref, label: "My profile", icon: UserRound },
  ];
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1">
      <Link href="/record" className="press mb-5 flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-bold text-on-accent">
        <Plus size={20} strokeWidth={2.75} aria-hidden="true" />Record match
      </Link>
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={isOn(path, it.href, meHref) ? "page" : undefined}
          className={`press flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${isOn(path, it.href, meHref) ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-3 hover:text-text"}`}>
          <it.icon size={19} strokeWidth={isOn(path, it.href, meHref) ? 2.4 : 1.9} aria-hidden="true" />{it.label}
          {it.count ? <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-loss px-1.5 text-micro font-bold text-on-accent">{it.count}</span> : null}
        </Link>
      ))}
      <Link href="/settings" aria-current={path === "/settings" ? "page" : undefined}
        className={`press mt-auto flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${path === "/settings" ? "bg-surface-3 text-text" : "text-text-2 hover:bg-surface-3 hover:text-text"}`}>
        <Settings size={19} aria-hidden="true" />Settings
      </Link>
    </nav>
  );
}

/** The mark: a bold B standing on a line (the "baseline"). Sport-neutral. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#111827" />
      <path fillRule="evenodd" fill="#fff" d="M19 12h17.5c6.4 0 11 4.3 11 10 0 3.4-1.6 6.2-4.2 7.9 3.6 1.6 6 5 6 9.1 0 6.3-5 10-11.8 10H19zm8.5 7.2v7.6h7.8c2.5 0 4-1.5 4-3.8s-1.5-3.8-4-3.8zm0 14.4v8.2h9.3c2.7 0 4.3-1.6 4.3-4.1s-1.6-4.1-4.3-4.1z" />
      <rect x="19" y="52.5" width="30" height="4" rx="2" fill="#4263eb" />
    </svg>
  );
}
export function Wordmark() {
  return <span className="inline-flex items-center gap-2"><Mark /><span className="display text-xl">Baseline</span></span>;
}
