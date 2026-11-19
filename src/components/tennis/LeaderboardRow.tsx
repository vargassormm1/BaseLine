import Link from "next/link";
import { Avatar, displayName } from "@/components/ui/Avatar";
import { FormDots, Movement } from "@/components/ui/bits";
import type { StandingRow } from "@/lib/tennis/standings";

/** One leaderboard row: position, movement, player, form, record, points. Top three get the optic rank. */
export function LeaderboardRow({ r, me, compact = false, href }: { r: StandingRow; me: string; compact?: boolean; /** defaults to the player's profile */ href?: string }) {
  const isMe = r.player.id === me;
  return (
    <li>
      <Link href={href ?? `/players/${r.player.username}`} aria-current={isMe ? "true" : undefined}
        className={`press flex items-center gap-3 px-4 ${compact ? "py-2.5" : "py-3.5"} ${isMe ? "bg-mint text-on-mint" : "hover:bg-surface-2"}`}>
        <span className="flex w-9 shrink-0 flex-col items-center">
          <span className={`score text-[26px] ${r.rank === null ? "text-text-3" : r.rank === 1 ? "text-accent-ink" : "text-text"}`}>{r.rank ?? "–"}</span>
          {r.rank !== null ? <Movement by={r.movement} /> : null}
        </span>
        <Avatar player={r.player} size={compact ? "sm" : "md"} ring={r.rank === 1} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{displayName(r.player)}{isMe ? <span className="ml-1.5 text-caption font-semibold text-text-3">You</span> : null}</span>
          <span className="mt-0.5 flex items-center gap-2 text-caption text-text-2">
            <span className="num">{r.wins}–{r.losses}</span>
            {r.winPct !== null ? <span className="num">{Math.round(r.winPct)}%</span> : null}
            {!compact ? <FormDots form={r.form} size={6} /> : null}
          </span>
        </span>
        <span className="text-right">
          <span className="score block text-[26px]">{r.points}</span>
          <span className="text-micro font-semibold text-text-3">pts</span>
        </span>
      </Link>
    </li>
  );
}
