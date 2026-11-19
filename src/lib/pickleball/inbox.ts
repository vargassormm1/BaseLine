import type { PbMatch } from "./standings";
import { sideOf } from "./standings";

type ChallengeLike = { id: string; status: string; side1: string[]; side2: string[] };

/** Pickleball results waiting for me to confirm, and challenges waiting for my answer. */
export function pbInbox<C extends ChallengeLike>(b: { matches: readonly PbMatch[]; challenges: readonly C[] }, me: string) {
  const toConfirm = b.matches.filter((m) => m.status === "pending" && sideOf(m, me) !== null && sideOf(m, me) !== m.recorderSide);
  const waiting = b.matches.filter((m) => m.status === "pending" && sideOf(m, me) === m.recorderSide);
  const toAnswer = b.challenges.filter((c) => c.status === "pending" && c.side2.includes(me));
  const sent = b.challenges.filter((c) => c.status === "pending" && c.side1.includes(me));
  const toPlay = b.challenges.filter((c) => c.status === "accepted" && (c.side1.includes(me) || c.side2.includes(me)));
  return { toConfirm, waiting, toAnswer, sent, toPlay };
}
export const pbAttention = (b: { matches: readonly PbMatch[]; challenges: readonly ChallengeLike[] }, me: string) => { const i = pbInbox(b, me); return i.toConfirm.length + i.toAnswer.length; };
