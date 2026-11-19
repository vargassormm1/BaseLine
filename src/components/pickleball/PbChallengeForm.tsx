"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPickleballChallenge } from "@/app/pickleball-actions";
import { PB_FORMATS, PB_SCORING_LABEL, PB_DEFAULT_FORMAT, type PbDiscipline, type PbFormat, type PbScoring } from "@/lib/pickleball/rules";
import type { Player } from "@/lib/tennis/types";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { PlayerPick } from "./PbRecordForm";

const chip = (on: boolean) => `press inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold ${on ? "bg-text text-bg" : "bg-surface-3 text-text hover:bg-line-strong"}`;

/** Singles: me vs one player. Doubles: me + partner vs two players; any one of them can accept. */
export function PbChallengeForm({ me, others, recent, today }: { me: Player; others: Player[]; recent: string[]; today: string }) {
  const router = useRouter();
  const [discipline, setDiscipline] = useState<PbDiscipline>("singles");
  const [partner, setPartner] = useState<string | null>(null);
  const [o1, setO1] = useState<string | null>(null);
  const [o2, setO2] = useState<string | null>(null);
  const [format, setFormat] = useState<PbFormat>(PB_DEFAULT_FORMAT);
  const [scoring, setScoring] = useState<PbScoring>("side_out");
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const doubles = discipline === "doubles";
  const taken = new Set([me.id, partner, o1, o2].filter(Boolean) as string[]);
  const pool = (cur: string | null) => others.filter((p) => p.id === cur || !taken.has(p.id));
  const side1 = doubles ? [me.id, partner] : [me.id], side2 = doubles ? [o1, o2] : [o1];
  const ready = [...side1, ...side2].every(Boolean);
  const send = () => start(async () => {
    const r = await createPickleballChallenge({ discipline, format, scoring, side1, side2, message: message.trim() || undefined, proposedFor: when || null });
    if (!r.ok) { setError(r.error); return; }
    toast("Challenge sent.");
    setPartner(null); setO1(null); setO2(null); setMessage(""); setWhen(""); setError(null);
    router.refresh();
  });
  return (
    <div className="card space-y-5 p-4 sm:p-5">
      <div className="flex gap-2">{(["singles", "doubles"] as const).map((d) => <button key={d} type="button" aria-pressed={discipline === d} onClick={() => { setDiscipline(d); if (d === "singles") { setPartner(null); setO2(null); } }} className={chip(discipline === d)}>{d === "singles" ? "Singles · 1 vs 1" : "Doubles · 2 vs 2"}</button>)}</div>
      {doubles ? <PlayerPick label="Your partner" value={partner} onChange={setPartner} pool={pool(partner)} recent={recent} locked={false} /> : null}
      <PlayerPick label={doubles ? "Opponent 1" : "Who are you challenging?"} value={o1} onChange={setO1} pool={pool(o1)} recent={recent} locked={false} />
      {doubles ? <PlayerPick label="Opponent 2" value={o2} onChange={setO2} pool={pool(o2)} recent={recent} locked={false} /> : null}
      <div className="flex flex-wrap gap-2">{(Object.keys(PB_FORMATS) as PbFormat[]).map((k) => <button key={k} type="button" aria-pressed={format === k} onClick={() => setFormat(k)} className={chip(format === k)}>{PB_FORMATS[k].label}</button>)}</div>
      <div className="flex flex-wrap gap-2">{(["side_out", "rally"] as const).map((s) => <button key={s} type="button" aria-pressed={scoring === s} onClick={() => setScoring(s)} className={chip(scoring === s)}>{PB_SCORING_LABEL[s]}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className="eyebrow">Message (optional)</span><input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={140} placeholder="Saturday at 9?" className="mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink" /></label>
        <label><span className="eyebrow">Day (optional)</span><input type="date" value={when} min={today} onChange={(e) => setWhen(e.target.value)} className="mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink" /></label>
      </div>
      {error ? <p role="alert" className="text-sm font-semibold text-loss-ink">{error}</p> : null}
      <Button full size="lg" disabled={!ready} loading={pending} onClick={send}>Send challenge</Button>
    </div>
  );
}
