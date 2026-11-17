"use client";
import { useEffect, useRef } from "react";

type TS = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id: string) => void; remove: (id: string) => void };
declare global { interface Window { turnstile?: TS } }
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Cloudflare Turnstile bot check. Adds the hidden `cf-turnstile-response` field to the surrounding form; Supabase
 *  Auth verifies it. `resetKey` changes after each submit so a used token is never sent twice. */
export function Turnstile({ siteKey, resetKey }: { siteKey: string; resetKey: unknown }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  useEffect(() => {
    let gone = false;
    const mount = () => { if (!gone && box.current && window.turnstile && !id.current) id.current = window.turnstile.render(box.current, { sitekey: siteKey, theme: "auto", size: "flexible", appearance: "interaction-only" }); };
    if (window.turnstile) mount();
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      if (!s) { s = document.createElement("script"); s.src = SRC; s.async = true; document.head.appendChild(s); }
      s.addEventListener("load", mount);
    }
    return () => { gone = true; if (id.current) window.turnstile?.remove(id.current); id.current = null; };
  }, [siteKey]);
  useEffect(() => { if (id.current) window.turnstile?.reset(id.current); }, [resetKey]);
  return <div ref={box} className="min-h-0" />;
}
