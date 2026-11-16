import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="score text-[96px] text-ball-ink">Out.</p>
      <p className="mt-3 text-text-2">That page isn&apos;t on the court.</p>
      <Link href="/" className={`${buttonClass("primary")} mt-6`}>Back to Baseline</Link>
    </main>
  );
}
