"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { cancelChallenge, cancelMatch, respondChallenge, respondMatch, voidMatch, type ActionResult } from "@/app/actions";

function useAct() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult>, done: string) => start(async () => {
    const r = await fn();
    // success: a toast (the card often disappears once answered); failure: stays next to the buttons
    if (r.ok) { setMsg(null); toast(done); router.refresh(); } else setMsg({ ok: false, text: r.error });
  });
  const note = msg ? <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm font-medium ${msg.ok ? "text-accent-ink" : "text-loss-ink"}`}>{msg.text}</p> : null;
  return { pending, run, note };
}

/** The opponent confirms (points count) or rejects a recorded result. */
export function ConfirmMatch({ id, size = "md" }: { id: string; size?: "sm" | "md" }) {
  const a = useAct();
  return (
    <div>
      <div className="flex gap-2">
        <Button size={size} loading={a.pending} onClick={() => a.run(() => respondMatch(id, true), "Confirmed. Points are in.")}><Check size={18} strokeWidth={2.75} aria-hidden="true" />Confirm</Button>
        <Button size={size} variant="secondary" disabled={a.pending} onClick={() => a.run(() => respondMatch(id, false), "Rejected.")}><X size={18} aria-hidden="true" />Not right</Button>
      </div>
      {a.note}
    </div>
  );
}

export function WithdrawMatch({ id }: { id: string }) {
  const a = useAct();
  return <div><Button variant="ghost" size="sm" loading={a.pending} onClick={() => a.run(() => cancelMatch(id), "Withdrawn.")}>Withdraw result</Button>{a.note}</div>;
}

export function VoidMatch({ id }: { id: string }) {
  const a = useAct();
  const [reason, setReason] = useState("");
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); a.run(() => voidMatch(id, reason), "Voided. It no longer counts."); }}>
      <label className="min-w-0 flex-1">
        <span className="eyebrow">Admin: void this result</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} required minLength={3} placeholder="Reason (kept with the match)"
          className="mt-1 h-11 w-full rounded-xl border border-line-strong bg-surface-2 px-3 text-base outline-none focus:border-accent-ink" />
      </label>
      <Button type="submit" variant="danger" size="md" loading={a.pending}>Void</Button>
      <div className="basis-full">{a.note}</div>
    </form>
  );
}

export function AnswerChallenge({ id }: { id: string }) {
  const a = useAct();
  return (
    <div>
      <div className="flex gap-2">
        <Button size="sm" loading={a.pending} onClick={() => a.run(() => respondChallenge(id, true), "Challenge accepted. Go play!")}>Accept</Button>
        <Button size="sm" variant="secondary" disabled={a.pending} onClick={() => a.run(() => respondChallenge(id, false), "Declined.")}>Decline</Button>
      </div>
      {a.note}
    </div>
  );
}

export function CancelChallenge({ id, label = "Cancel" }: { id: string; label?: string }) {
  const a = useAct();
  return <div><Button size="sm" variant="ghost" loading={a.pending} onClick={() => a.run(() => cancelChallenge(id), "Canceled.")}>{label}</Button>{a.note}</div>;
}
