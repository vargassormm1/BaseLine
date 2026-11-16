"use client";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-20 text-center" role="alert">
      <p className="display text-[34px]">Fault.</p>
      <p className="mt-3 text-text-2">Something went wrong loading this screen. Your data is safe.</p>
      <div className="mt-6"><Button onClick={reset}><RotateCcw size={16} aria-hidden="true" />Try again</Button></div>
    </div>
  );
}
