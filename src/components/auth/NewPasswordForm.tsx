"use client";
import { useActionState } from "react";
import { setNewPassword } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";

const field = "mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink";

export function NewPasswordForm() {
  const [state, submit, pending] = useActionState(setNewPassword, null);
  return (
    <form action={submit} className="space-y-4" noValidate>
      <label className="block"><span className="eyebrow">New password</span>
        <input name="password" type="password" required minLength={10} maxLength={72} autoComplete="new-password" className={field} aria-describedby="np-help" />
        <span id="np-help" className="mt-1 block text-caption text-text-3">At least 10 characters, with letters and numbers.</span>
      </label>
      <label className="block"><span className="eyebrow">Type it again</span>
        <input name="confirm" type="password" required maxLength={72} autoComplete="new-password" className={field} />
      </label>
      {state?.error ? <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-ink">{state.error}</p> : null}
      <Button type="submit" size="lg" full loading={pending}>Save password</Button>
    </form>
  );
}
