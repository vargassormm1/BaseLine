"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import type { ActionResult } from "@/app/actions";
import { cancelPickleball, respondPickleball, respondPickleballChallenge, voidPickleball } from "@/app/pickleball-actions";

function useAct() {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult>, done: string) => start(async () => {
    const r = await fn();
    if (r.ok) { setErr(null); toast(done); router.refresh(); } else setErr(r.error);
  });
  return { pending, run, note: err ? <p role="alert" className="mt-2 text-sm font-medium text-loss-ink">{err}</p> : null };
}

/** A player on the other side confirms (points count) or rejects a recorded pickleball result. */
export function ConfirmPb({ id, size = "md" }: { id: string; size?: "sm" | "md" }) {
  const a = useAct();
  return (
    <div>
      <div className="flex gap-2">
        <Button size={size} loading={a.pending} onClick={() => a.run(() => respondPickleball(id, true), "Confirmed. Points are in.")}><Check size={18} strokeWidth={2.75} aria-hidden="true" />Confirm</Button>
        <Button size={size} variant="secondary" disabled={a.pending} onClick={() => a.run(() => respondPickleball(id, false), "Rejected.")}><X size={18} aria-hidden="true" />Not right</Button>
      </div>
      {a.note}
    </div>
  );
}

export function WithdrawPb({ id }: { id: string }) {
  const a = useAct();
  return <div><Button variant="ghost" size="sm" loading={a.pending} onClick={() => a.run(() => cancelPickleball(id), "Withdrawn.")}>Withdraw result</Button>{a.note}</div>;
}

export function VoidPb({ id }: { id: string }) {
  const a = useAct();
  const [reason, setReason] = useState("");
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); a.run(() => voidPickleball(id, reason), "Voided. It no longer counts."); }}>
      <label className="min-w-0 flex-1">
        <span className="eyebrow">Admin: void this result</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} required minLength={3} placeholder="Reason (kept with the match)"
          className="mt-1 h-11 w-full rounded-xl border border-line-strong bg-surface-2 px-3 text-base outline-none focus:border-accent-ink" />
      </label>
      <Button type="submit" variant="danger" size="sm" loading={a.pending}>Void</Button>
      {a.note}
    </form>
  );
}

export function AnswerPbChallenge({ id }: { id: string }) {
  const a = useAct();
  return (
    <div>
      <div className="flex gap-2">
        <Button size="sm" loading={a.pending} onClick={() => a.run(() => respondPickleballChallenge(id, "accept"), "Challenge accepted. Game on.")}><Check size={16} strokeWidth={2.75} aria-hidden="true" />Accept</Button>
        <Button size="sm" variant="secondary" disabled={a.pending} onClick={() => a.run(() => respondPickleballChallenge(id, "decline"), "Declined.")}>Decline</Button>
      </div>
      {a.note}
    </div>
  );
}

export function CancelPbChallenge({ id }: { id: string }) {
  const a = useAct();
  return <div><Button variant="ghost" size="sm" loading={a.pending} onClick={() => a.run(() => respondPickleballChallenge(id, "cancel"), "Challenge canceled.")}>Cancel challenge</Button>{a.note}</div>;
}
