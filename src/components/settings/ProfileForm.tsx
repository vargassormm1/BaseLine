"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chooseUsername, updateProfile } from "@/app/actions";
import { Button } from "@/components/ui/Button";

export function ProfileForm({ initial, mode }: { initial: { username: string; firstName: string; lastName: string; invite?: string }; mode: "edit" | "welcome" }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const field = "mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink";
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const r = await (mode === "welcome" ? chooseUsername(v) : updateProfile(v));
        if (r.ok) { setMsg({ ok: true, text: "Saved." }); router.refresh(); } else setMsg({ ok: false, text: r.error });
        // (welcome redirects on success, so the message is only seen in Settings)
      });
    }}>
      {mode === "welcome" ? (
        <label className="block"><span className="eyebrow">Invite code</span>
          <input required value={v.invite ?? ""} onChange={(e) => setV({ ...v, invite: e.target.value })} autoCapitalize="characters" autoCorrect="off" spellCheck={false} className={`${field} font-semibold tracking-[0.12em]`} aria-describedby="inv-help" />
          <span id="inv-help" className="mt-1 block text-caption text-text-3">Baseline is invite-only. Your invite link fills this in.</span>
        </label>
      ) : null}
      <label className="block"><span className="eyebrow">Username</span>
        <input required value={v.username} onChange={(e) => setV({ ...v, username: e.target.value })} pattern="[A-Za-z0-9_.\-]{3,24}" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={field} aria-describedby="un-help" />
        <span id="un-help" className="mt-1 block text-caption text-text-3">3–24 letters, numbers, dots, dashes or underscores. It&apos;s your profile link.</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="eyebrow">First name</span><input value={v.firstName} required={mode === "welcome"} maxLength={40} onChange={(e) => setV({ ...v, firstName: e.target.value })} className={field} autoComplete="given-name" /></label>
        <label className="block"><span className="eyebrow">Last name</span><input value={v.lastName} maxLength={40} onChange={(e) => setV({ ...v, lastName: e.target.value })} className={field} autoComplete="family-name" /></label>
      </div>
      {msg ? <p role={msg.ok ? "status" : "alert"} className={`text-sm font-semibold ${msg.ok ? "text-accent-ink" : "text-loss-ink"}`}>{msg.text}</p> : null}
      <Button type="submit" loading={pending} full={mode === "welcome"} size={mode === "welcome" ? "lg" : "md"}>{mode === "welcome" ? "Let's play" : "Save"}</Button>
    </form>
  );
}
