"use client";
import { useState, useTransition } from "react";
import { Copy, UserPlus } from "lucide-react";
import { createInvite } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

/** One-time invite link for a friend. The code is shown once (the database keeps only a hash). */
export function InviteFriend() {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-2">Baseline is invite-only. Each link works once and expires in 14 days.</p>
      {link ? (
        <div className="flex items-center gap-2 rounded-2xl bg-surface-3 p-2 pl-4">
          <code className="min-w-0 flex-1 truncate text-sm font-semibold">{link}</code>
          <Button size="sm" variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(link); toast("Invite link copied."); } catch { setError("Couldn't copy. Select the link and copy it."); } }}><Copy size={15} aria-hidden="true" />Copy</Button>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-sm font-semibold text-loss-ink">{error}</p> : null}
      <Button variant={link ? "ghost" : "primary"} size="md" loading={pending} onClick={() => start(async () => {
        const r = await createInvite();
        if (!r.ok || !r.code) { setError(r.ok ? "Couldn't create an invite." : r.error); return; }
        setError(null);
        const c = r.code;
        setLink(`${location.origin}/join/${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`);
      })}><UserPlus size={16} aria-hidden="true" />{link ? "Another invite" : "Create invite link"}</Button>
    </div>
  );
}
