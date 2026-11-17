import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const V: Record<Variant, string> = {
  primary: "lift bg-accent text-on-accent font-bold hover:brightness-105",
  secondary: "bg-surface-3 text-text font-semibold hover:bg-line-strong",
  ghost: "text-text-2 font-semibold hover:bg-surface-3 hover:text-text",
  danger: "border border-line-strong text-loss-ink font-semibold hover:bg-surface-3",
};
const S = { sm: "h-11 px-4 text-sm rounded-full", md: "h-12 px-5 text-base rounded-full", lg: "h-14 px-6 text-base rounded-full" };
export const buttonClass = (v: Variant = "primary", s: keyof typeof S = "md", full = false) =>
  `press inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap disabled:pointer-events-none disabled:opacity-45 ${V[v]} ${S[s]} ${full ? "w-full" : ""}`;

export function Button({ variant = "primary", size = "md", full = false, loading = false, className = "", children, type = "button", ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof S; full?: boolean; loading?: boolean }) {
  return (
    <button type={type} {...rest} disabled={rest.disabled || loading} aria-busy={loading || undefined} className={`${buttonClass(variant, size, full)} ${className}`}>
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
export function ButtonLink({ href, variant = "primary", size = "md", full = false, className = "", children }: { href: string; variant?: Variant; size?: keyof typeof S; full?: boolean; className?: string; children: ReactNode }) {
  return <Link href={href} className={`${buttonClass(variant, size, full)} ${className}`}>{children}</Link>;
}
