import { sideOf, type SideMatch } from "@/lib/sides/standings";

type M = SideMatch & { recorderSide: 1 | 2 };

type ChallengeLike = { id: string; status: string; side1: string[]; side2: string[] };

/** Two-sides results (pickleball, tennis doubles) waiting for me to confirm, and challenges waiting for my answer. */
export function pbInbox<X extends M, C extends ChallengeLike>(b: { matches: readonly X[]; challenges: readonly C[] }, me: string) {
  const toConfirm = b.matches.filter((m) => m.status === "pending" && sideOf(m, me) !== null && sideOf(m, me) !== m.recorderSide);
  const waiting = b.matches.filter((m) => m.status === "pending" && sideOf(m, me) === m.recorderSide);
  const toAnswer = b.challenges.filter((c) => c.status === "pending" && c.side2.includes(me));
  const sent = b.challenges.filter((c) => c.status === "pending" && c.side1.includes(me));
  const toPlay = b.challenges.filter((c) => c.status === "accepted" && (c.side1.includes(me) || c.side2.includes(me)));
  return { toConfirm, waiting, toAnswer, sent, toPlay };
}
export const pbAttention = (b: { matches: readonly M[]; challenges: readonly ChallengeLike[] }, me: string) => { const i = pbInbox(b, me); return i.toConfirm.length + i.toAnswer.length; };
export { pbInbox as sidesInbox, pbAttention as sidesAttention };
