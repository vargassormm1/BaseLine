"use client";
import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { Avatar, displayName } from "@/components/ui/Avatar";

interface Row { id: string; username: string; firstName: string; lastName: string; avatarUrl: string | null; rank: number | null; wins: number; losses: number; points: number }
export function PlayerList({ rows, me }: { rows: Row[]; me: string }) {
  const [q, setQ] = useState("");
  const shown = q.trim() ? rows.filter((r) => `${r.username} ${r.firstName} ${r.lastName}`.toLowerCase().includes(q.trim().toLowerCase())) : rows;
  return (
    <div className="space-y-4">
      <label className="flex h-12 items-center gap-2 rounded-2xl border border-line-strong bg-surface px-4 focus-within:border-ball-ink">
        <Search size={18} className="text-text-3" aria-hidden="true" /><span className="sr-only">Search players</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or username" className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-text-3" />
      </label>
      <ul className="grid gap-3 sm:grid-cols-2">
        {shown.map((r) => (
          <li key={r.id}>
            <Link href={`/players/${r.username}`} className="press card flex items-center gap-3 p-4 hover:border-line-strong">
              <Avatar player={r} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{displayName(r)}{r.id === me ? <span className="ml-1.5 text-caption font-semibold text-text-3">You</span> : null}</span>
                <span className="block text-sm text-text-2">@{r.username}</span>
                <span className="num mt-1 block text-caption text-text-3">{r.rank ? `#${r.rank} · ` : ""}{r.wins}–{r.losses} · {r.points} pts</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!shown.length ? <p className="text-sm text-text-2">No player matches “{q.trim()}”.</p> : null}
    </div>
  );
}
