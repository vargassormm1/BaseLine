"use client";
import { useActionState, useState } from "react";
import { emailSignIn, emailSignUp, resendConfirmation, sendPasswordReset, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/Button";
import { Turnstile } from "./Turnstile";

type Mode = "sign-in" | "sign-up" | "forgot";
const field = "mt-1.5 h-12 w-full rounded-2xl border border-line-strong bg-surface-2 px-4 text-base outline-none focus:border-accent-ink";

export function EmailAuth({ next, initialMode = "sign-in", siteKey }: { next: string; initialMode?: Mode; siteKey: string | null }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const action = mode === "sign-up" ? emailSignUp : mode === "forgot" ? sendPasswordReset : emailSignIn;
  // a fresh action state per mode, so a message from one form never shows on another
  return <EmailForm key={mode} mode={mode} setMode={setMode} action={action} next={next} siteKey={siteKey} />;
}

function EmailForm({ mode, setMode, action, next, siteKey }: { mode: Mode; setMode: (m: Mode) => void; action: (s: AuthState, f: FormData) => Promise<AuthState>; next: string; siteKey: string | null }) {
  const [state, submit, pending] = useActionState(action, null);
  const [resent, resend, resending] = useActionState(resendConfirmation, null);
  const [email, setEmail] = useState("");

  if (state?.sent) {
    return (
      <div role="status" className="rounded-3xl border border-line bg-surface px-5 py-5">
        <p className="text-lg font-bold">Check your email</p>
        <p className="mt-2 text-sm text-text-2">
          {state.sent === "confirm"
            ? <>If <span className="font-semibold text-text">{state.email}</span> can be used for Baseline, we sent a link to confirm it. Open it to finish signing up.</>
            : <>If there&apos;s a Baseline account for <span className="font-semibold text-text">{state.email}</span>, we sent a link to choose a new password.</>}
        </p>
        <p className="mt-2 text-caption text-text-3">It can take a minute. Check spam too. The link works once and expires in an hour.</p>
        <button type="button" onClick={() => setMode("sign-in")} className="press mt-4 min-h-11 text-sm font-bold text-accent-ink underline-offset-4 hover:underline">Back to sign in</button>
      </div>
    );
  }

  return (
    <div>
      {mode !== "forgot" ? (
        <div role="tablist" aria-label="Sign in or create an account" className="grid grid-cols-2 rounded-full bg-surface-3 p-1">
          {(["sign-in", "sign-up"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} aria-controls="email-form" onClick={() => setMode(m)}
              className={`press h-10 rounded-full text-sm font-bold ${mode === m ? "bg-surface text-text shadow-sm" : "text-text-2"}`}>
              {m === "sign-in" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>
      ) : <p className="text-lg font-bold">Reset your password</p>}

      <form id="email-form" role={mode !== "forgot" ? "tabpanel" : undefined} aria-label={mode === "sign-up" ? "Create account" : mode === "forgot" ? "Reset your password" : "Sign in"} action={submit} className="mt-4 space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <label className="block"><span className="eyebrow">Email</span>
          <input name="email" type="email" required autoComplete={mode === "sign-up" ? "email" : "username"} inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            defaultValue={state?.email ?? ""} onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        {mode !== "forgot" ? (
          <label className="block"><span className="eyebrow">Password</span>
            <input name="password" type="password" required minLength={mode === "sign-up" ? 10 : undefined} maxLength={72}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"} className={field} aria-describedby={mode === "sign-up" ? "pw-help" : undefined} />
            {mode === "sign-up" ? <span id="pw-help" className="mt-1 block text-caption text-text-3">At least 10 characters, with letters and numbers.</span> : null}
          </label>
        ) : <p className="text-sm text-text-2">Enter the email you signed up with and we&apos;ll send a link to choose a new password.</p>}
        {siteKey ? <Turnstile siteKey={siteKey} resetKey={state} /> : null}
        {state?.error ? <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-ink">{state.error}</p> : null}
        <Button type="submit" size="lg" full loading={pending}>{mode === "sign-up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
      </form>

      {state?.unconfirmed ? (
        <form action={resend} className="mt-3">
          <input type="hidden" name="email" value={state.email ?? email} />
          <Button type="submit" variant="secondary" full loading={resending}>{resent?.sent ? "Sent. Check your inbox" : "Send the confirmation link again"}</Button>
          {resent?.error ? <p role="alert" className="mt-2 text-sm font-semibold text-loss-ink">{resent.error}</p> : null}
        </form>
      ) : null}

      <div className="mt-4 text-center">
        {mode === "sign-in" ? <button type="button" onClick={() => setMode("forgot")} className="press min-h-11 text-sm font-semibold text-text-2 underline-offset-4 hover:underline">Forgot password?</button> : null}
        {mode === "forgot" ? <button type="button" onClick={() => setMode("sign-in")} className="press min-h-11 text-sm font-semibold text-text-2 underline-offset-4 hover:underline">Back to sign in</button> : null}
      </div>
    </div>
  );
}
