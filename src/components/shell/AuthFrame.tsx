import Link from "next/link";
import { Wordmark } from "./Nav";
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-safe flex min-h-dvh flex-col items-center px-4 py-8">
      <Link href="/" aria-label="Baseline home" className="mb-8"><Wordmark /></Link>
      {children}
    </main>
  );
}
