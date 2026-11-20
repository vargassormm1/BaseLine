"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDoublesChallenge } from "@/app/doubles-actions";
import { D_DEFAULT, D_FORMATS, isShort, type DFormat } from "@/lib/tennis/doubles";
import type { Player } from "@/lib/tennis/types";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { PlayerPick } from "@/components/pickleball/PbRecordForm";

const chip = (on: boolean) => `press inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${on ? "bg-text text-bg" : "bg-surface-3 text-text hover:bg-line-strong"}`;

/** Tennis doubles challenge: me + partner vs two players; either of them can accept. */
export function DoublesChallengeForm({ me, others, recent, today }: { me: Player; others: Player[]; recent: string[]; today: string }) {
  const router = useRouter();
  const [partner, setPartner] = useState<string | null>(null);
  const [o1, setO1] = useState<string | null>(null);
  const [o2, setO2] = useState<string | null>(null);
  const [format, setFormat] = useState<DFormat>(D_DEFAULT);
  const [noAd, setNoAd] = useState(false);
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const taken = new Set([me.id, partner, o1, o2].filter(Boolean) as string[]);
  const pool = (cur: string | null) => others.filter((p) => p.id === cur || !taken.has(p.id));
  const side1 = [me.id, partner], side2 = [o1, o2];
  const ready = [...side1, ...side2].every(Boolean);
  const send = () => start(async () => {
    const r = await createDoublesChallenge({ format, shortTieAt: isShort(format) ? 4 : null, noAd, side1, side2, message: message.trim() || undefined, proposedFor: when || null });
    if (!r.ok) { setError(r.error); return; }
    toast("Challenge sent.");
    setPartner(null); setO1(null); setO2(null); setMessage(""); setWhen(""); setError(null);
    router.refresh();
  });
  return (
    <div className="card space-y-5 p-4 sm:p-5">
      <PlayerPick label="Your partner" value={partner} onChange={setPartner} pool={pool(partner)} recent={recent} locked={false} />
      <PlayerPick label="Opponent 1" value={o1} onChange={setO1} pool={pool(o1)} recent={recent} locked={false} />
      <PlayerPick label="Opponent 2" value={o2} onChange={setO2} pool={pool(o2)} recent={recent} locked={false} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Format">{(Object.keys(D_FORMATS) as DFormat[]).map((k) => <button key={k} type="button" aria-pressed={format === k} onClick={() => setFormat(k)} className={chip(format === k)}>{D_FORMATS[k].label}</button>)}</div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={noAd} onChange={(e) => setNoAd(e.target.checked)} className="size-5 accent-[var(--accent)]" />No-ad scoring</label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="eyebrow">Message (optional)</span><input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={140} placeholder="Saturday at 9?" className="mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink" /></label>
        <label><span className="eyebrow">Day (optional)</span><input type="date" value={when} min={today} onChange={(e) => setWhen(e.target.value)} className="mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink" /></label>
      </div>
      {error ? <p role="alert" className="text-sm font-semibold text-loss-ink">{error}</p> : null}
      <Button full size="lg" disabled={!ready} loading={pending} onClick={send}>Send doubles challenge</Button>
    </div>
  );
}
