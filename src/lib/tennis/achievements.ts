// A few earned milestones, all derived from confirmed matches (nothing stored, nothing to game).
import { setsFor, type PlayerStats } from "./stats";
import type { Match } from "./types";

export interface Achievement { key: string; title: string; description: string; earned: boolean; progress?: [number, number] }

export function achievements(id: string, s: PlayerStats, matches: readonly Match[]): Achievement[] {
  const mine = matches.filter((m) => m.status === "confirmed" && (m.p1 === id || m.p2 === id));
  const won = mine.filter((m) => m.winner === id);
  const bagel = mine.some((m) => setsFor(m, id).some((x) => !x.isMatchTiebreak && x.mine === 6 && x.theirs === 0));
  const comeback = won.some((m) => { const s = setsFor(m, id); return s.length > 1 && s[0]!.mine < s[0]!.theirs; });
  const topRival = s.rivals[0]?.played ?? 0;
  const step = (n: number, goal: number): Pick<Achievement, "earned" | "progress"> => ({ earned: n >= goal, progress: [Math.min(n, goal), goal] });
  return [
    { key: "first_win", title: "First win", description: "Win a match.", ...step(s.wins, 1) },
    { key: "double_digits", title: "Double digits", description: "Win 10 matches.", ...step(s.wins, 10) },
    { key: "quarter_century", title: "Quarter century", description: "Win 25 matches.", ...step(s.wins, 25) },
    { key: "half_century", title: "Fifty", description: "Win 50 matches.", ...step(s.wins, 50) },
    { key: "bagel", title: "Bagel", description: "Win a set 6–0.", earned: bagel },
    { key: "hot_streak", title: "Hot streak", description: "Win 5 matches in a row.", ...step(s.longestWinStreak, 5) },
    { key: "clutch", title: "Clutch", description: "Win 5 tiebreaks.", ...step(s.tiebreaksWon, 5) },
    { key: "comeback", title: "Comeback", description: "Win a match after losing the first set.", earned: comeback },
    { key: "rivalry", title: "Rivalry", description: "Play the same opponent 10 times.", ...step(topRival, 10) },
  ];
}
