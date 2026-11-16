import Link from "next/link";
/** A switch between a few views, as links (works without JavaScript, keeps the URL shareable). */
export function Segmented({ items, label }: { items: { href: string; label: string; on: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-full bg-surface-3 p-1">
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={it.on ? "page" : undefined}
          className={`press inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold ${it.on ? "bg-surface text-text shadow-sm" : "text-text-2 hover:text-text"}`}>{it.label}</Link>
      ))}
    </nav>
  );
}
