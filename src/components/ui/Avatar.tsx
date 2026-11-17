import type { Player } from "@/lib/tennis/types";

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 88, hero: 112 } as const;
/** The photo a player uploaded, or their initials. */
export function Avatar({ player, size = "md", ring = false }: { player: Pick<Player, "username" | "firstName" | "lastName" | "avatarUrl"> | undefined; size?: keyof typeof SIZES; ring?: boolean }) {
  const px = SIZES[size];
  const initials = ((player?.firstName?.[0] ?? "") + (player?.lastName?.[0] ?? "")).toUpperCase() || (player?.username?.[0] ?? "?").toUpperCase();
  const cls = `relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 text-text-2 ${ring ? "ring-2 ring-gold ring-offset-2 ring-offset-bg" : ""}`;
  return (
    <span className={cls} style={{ width: px, height: px }} aria-hidden="true">
      {player?.avatarUrl ? <img src={player.avatarUrl} alt="" width={px} height={px} loading="lazy" decoding="async" className="size-full object-cover" />
        : <span className="font-bold" style={{ fontSize: Math.round(px * 0.38), fontStretch: "90%" }}>{initials}</span>}
    </span>
  );
}
export const displayName = (p: Pick<Player, "username" | "firstName" | "lastName"> | undefined) =>
  !p ? "Unknown player" : `${p.firstName} ${p.lastName}`.trim() || p.username;
export const shortName = (p: Pick<Player, "username" | "firstName"> | undefined) => (!p ? "?" : p.firstName || p.username);
