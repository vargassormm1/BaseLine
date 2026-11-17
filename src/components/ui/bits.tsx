import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { Result } from "@/lib/tennis/standings";

/** Recent results (most recent first): a filled dot for a win, a hollow ring for a loss, so it never relies on color. */
export function FormDots({ form, size = 8, onDark = false }: { form: Result[]; size?: number; onDark?: boolean }) {
  if (!form.length) return <span className="text-caption text-text-3">No matches yet</span>;
  return (
    <span className={`inline-flex items-center gap-1 ${onDark ? "text-[#7be5b3]" : "text-accent-ink"}`} role="img" aria-label={`Recent form, newest first: ${form.map((r) => (r === "W" ? "win" : "loss")).join(", ")}`}>
      {form.map((r, i) => <span key={i} className={`rounded-full ${r === "W" ? "bg-current" : "border-[1.5px] border-current opacity-60"}`} style={{ width: size, height: size }} />)}
    </span>
  );
}

/** Places gained or lost in the last 7 days. */
export function Movement({ by }: { by: number | null }) {
  if (by === null) return <span className="text-micro font-bold text-text-3">new<span className="sr-only"> this week</span></span>;
  if (by === 0) return <span><Minus size={12} className="text-text-3" aria-hidden="true" /><span className="sr-only">no change this week</span></span>;
  return by > 0
    ? <span className="inline-flex items-center text-micro font-bold text-accent-ink"><ArrowUp size={12} strokeWidth={3} aria-hidden="true" /><span className="sr-only">up </span>{by}<span className="sr-only"> this week</span></span>
    : <span className="inline-flex items-center text-micro font-bold text-loss-ink"><ArrowDown size={12} strokeWidth={3} aria-hidden="true" /><span className="sr-only">down </span>{-by}<span className="sr-only"> this week</span></span>;
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "win" | "loss" | "warn" | "accent"; children: ReactNode }) {
  const t = { neutral: "bg-surface-3 text-text-2", win: "bg-surface-3 text-accent-ink", loss: "bg-surface-3 text-loss-ink", warn: "bg-warn-bg text-warn-ink", accent: "bg-accent text-on-accent" }[tone];
  return <span className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-caption font-semibold ${t}`}>{children}</span>;
}

export function SectionHeader({ title, href, linkLabel, id }: { title: string; href?: string; linkLabel?: string; id?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 id={id} className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
      {href ? <Link href={href} className="press -my-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent-ink">{linkLabel ?? "See all"}</Link> : null}
    </div>
  );
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      {icon ? <span className="mb-3 grid size-12 place-items-center rounded-full bg-surface-3 text-text-2">{icon}</span> : null}
      <p className="font-bold">{title}</p>
      {children ? <p className="mt-1 max-w-sm text-sm text-text-2">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="score text-[34px] text-text">{value}</p>
      <p className="mt-1.5 text-caption font-semibold text-text-2">{label}</p>
      {sub ? <p className="text-caption text-text-3">{sub}</p> : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 pt-2">
      <div className="min-w-0">
        <h1 className="display text-[34px] sm:text-[40px]">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-text-2">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}
