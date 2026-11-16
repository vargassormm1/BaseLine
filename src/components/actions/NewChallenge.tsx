"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, X } from "lucide-react";
import { createChallenge } from "@/app/actions";
import { FORMAT_LABEL, type Format, type Player } from "@/lib/tennis/types";
import { Button } from "@/components/ui/Button";
import { addDays } from "@/lib/tennis/dates";

/** "Challenge someone" in a sheet (bottom sheet on phones, dialog on desktop). */
export function NewChallenge({ players, today, preset, label = "New challenge" }: { players: Player[]; today: string; preset?: string; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [opponent, setOpponent] = useState(preset ?? "");
  const [format, setFormat] = useState<Format>(1);
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const close = () => ref.current?.close();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await createChallenge({ opponent, format, message: message.trim() || undefined, proposedFor: date });
      if (!r.ok) { setError(r.error); return; }
      close(); setMessage(""); setDate(""); router.refresh();
    });
  };
  const input = "h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-ball-ink";
  return (
    <>
      <Button onClick={() => { setError(null); ref.current?.showModal(); }}><Flag size={17} aria-hidden="true" />{label}</Button>
      <dialog ref={ref} className="sheet" aria-labelledby="nc-title" onClick={(e) => { if (e.target === ref.current) close(); }}>
        <form onSubmit={submit} className="space-y-5 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:p-6">
          <div className="flex items-center justify-between">
            <h2 id="nc-title" className="display text-2xl">Challenge</h2>
            <button type="button" onClick={close} aria-label="Close" className="press grid size-11 place-items-center rounded-full bg-surface-3"><X size={18} aria-hidden="true" /></button>
          </div>
          <label className="block"><span className="eyebrow">Opponent</span>
            <select required value={opponent} onChange={(e) => setOpponent(e.target.value)} className={`${input} mt-1.5`}>
              <option value="" disabled>Pick a player</option>
              {players.map((p) => <option key={p.id} value={p.id}>{`${p.firstName} ${p.lastName}`.trim() || p.username} (@{p.username})</option>)}
            </select>
          </label>
          <fieldset><legend className="eyebrow">Format</legend>
            <div role="radiogroup" className="mt-1.5 flex flex-wrap gap-2">
              {([1, 3, 5] as Format[]).map((f) => (
                <button key={f} type="button" role="radio" aria-checked={format === f} onClick={() => setFormat(f)}
                  className={`press h-11 rounded-full px-4 text-sm font-semibold ${format === f ? "bg-text text-bg" : "bg-surface-3"}`}>{FORMAT_LABEL[f]}</button>
              ))}
            </div>
          </fieldset>
          <label className="block"><span className="eyebrow">Message (optional)</span>
            <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={140} placeholder="Saturday at the park?" className={`${input} mt-1.5`} />
          </label>
          <label className="block"><span className="eyebrow">Suggested date (optional)</span>
            <input type="date" value={date} min={today} max={addDays(today, 90)} onChange={(e) => setDate(e.target.value)} className={`${input} mt-1.5`} />
          </label>
          {error ? <p role="alert" className="text-sm font-semibold text-clay-ink">{error}</p> : null}
          <Button type="submit" full size="lg" loading={pending} disabled={!opponent}>Send challenge</Button>
          <p className="text-center text-caption text-text-3">They have 14 days to answer.</p>
        </form>
      </dialog>
    </>
  );
}
