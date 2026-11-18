"use client";
import { useActionState, useState } from "react";
import { passwordSignIn, passwordSignUp, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Turnstile } from "./Turnstile";

type Mode = "sign-in" | "sign-up";
const field = "mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink";

export function PasswordAuth({ next, initialMode = "sign-in", siteKey }: { next: string; initialMode?: Mode; siteKey: string | null }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  return (
    <div>
      <div role="tablist" aria-label="Sign in or create an account" className="grid grid-cols-2 rounded-full bg-surface-3 p-1">
        {(["sign-in", "sign-up"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} aria-controls="password-form" onClick={() => setMode(m)}
            className={`press h-10 rounded-full text-sm font-bold ${mode === m ? "bg-surface text-text shadow-sm" : "text-text-2"}`}>
            {m === "sign-in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      {/* a fresh form (and message) per tab */}
      <PasswordForm key={mode} mode={mode} next={next} siteKey={siteKey} />
    </div>
  );
}

function PasswordForm({ mode, next, siteKey }: { mode: Mode; next: string; siteKey: string | null }) {
  const [state, submit, pending] = useActionState(mode === "sign-up" ? passwordSignUp : passwordSignIn, null);
  const signUp = mode === "sign-up";
  return (
    <form id="password-form" role="tabpanel" aria-label={signUp ? "Create account" : "Sign in"} action={submit} className="mt-4 space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <label className="block"><span className="eyebrow">Username</span>
        <input name="username" required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={24}
          defaultValue={state?.username ?? ""} className={field} aria-describedby={signUp ? "un-rules" : undefined} />
        {signUp ? <span id="un-rules" className="mt-1 block text-caption text-text-3">3–24 letters, numbers, dots, dashes or underscores.</span> : null}
      </label>
      <label className="block"><span className="eyebrow">Password</span>
        <input name="password" type="password" required minLength={signUp ? 10 : undefined} maxLength={72}
          autoComplete={signUp ? "new-password" : "current-password"} className={field} aria-describedby={signUp ? "pw-rules" : undefined} />
        {signUp ? <span id="pw-rules" className="mt-1 block text-caption text-text-3">At least 10 characters, with letters and numbers.</span> : null}
      </label>
      {siteKey ? <Turnstile siteKey={siteKey} resetKey={state} /> : null}
      {state?.error ? <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-ink">{state.error}</p> : null}
      <Button type="submit" size="lg" full loading={pending}>{signUp ? "Create account" : "Sign in"}</Button>
      {!signUp ? <p className="text-center text-caption text-text-3">Forgot your password? Ask the person who runs your Baseline to reset it.</p> : null}
    </form>
  );
}
