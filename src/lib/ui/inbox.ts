import type { Board } from "@/lib/server/data";
/** What needs this player: results to confirm, challenges to answer, accepted challenges without a result. */
export function inbox(board: Board, me: string) {
  const toConfirm = board.matches.filter((m) => m.status === "pending" && m.p2 === me);
  const waitingOnThem = board.matches.filter((m) => m.status === "pending" && m.p1 === me);
  const toAnswer = board.challenges.filter((c) => c.status === "pending" && c.opponent === me);
  const sent = board.challenges.filter((c) => c.status === "pending" && c.challenger === me);
  const live = new Set(board.matches.filter((m) => m.challengeId && (m.status === "pending" || m.status === "confirmed")).map((m) => m.challengeId));
  const toPlay = board.challenges.filter((c) => c.status === "accepted" && !live.has(c.id));
  return { toConfirm, waitingOnThem, toAnswer, sent, toPlay };
}
export const attentionCount = (board: Board, me: string) => { const i = inbox(board, me); return i.toConfirm.length + i.toAnswer.length; };
