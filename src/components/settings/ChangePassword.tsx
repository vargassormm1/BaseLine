"use client";
import { useActionState } from "react";
import { changePassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";

const field = "mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink";

export function ChangePassword({ username }: { username: string }) {
  const [state, submit, pending] = useActionState(changePassword, null);
  return (
    <form action={submit} className="space-y-4" noValidate key={state?.ok ? "done" : "form"}>
      <p className="text-sm text-text-2">You sign in as <span className="font-semibold text-text">{username}</span>.</p>
      <input type="text" name="username" autoComplete="username" defaultValue={username} hidden readOnly />
      <label className="block"><span className="eyebrow">Current password</span><input name="current" type="password" required maxLength={72} autoComplete="current-password" className={field} /></label>
      <label className="block"><span className="eyebrow">New password</span>
        <input name="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" className={field} aria-describedby="cp-rules" />
        <span id="cp-rules" className="mt-1 block text-caption text-text-3">At least 10 characters, with letters and numbers.</span>
      </label>
      <label className="block"><span className="eyebrow">Type it again</span><input name="confirm" type="password" required maxLength={72} autoComplete="new-password" className={field} /></label>
      {state?.error ? <p role="alert" className="text-sm font-semibold text-loss-ink">{state.error}</p> : null}
      {state?.ok ? <p role="status" className="text-sm font-semibold text-accent-ink">Password changed.</p> : null}
      <Button type="submit" variant="secondary" loading={pending}>Change password</Button>
    </form>
  );
}
