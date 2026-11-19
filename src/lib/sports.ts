// The sports Baseline supports and where each one's screens live. Shared screens (players, settings) follow the last
// sport you used (cookie). Adding a sport = an entry here + its rules module + its pages; no scattered conditionals.
export type SportKey = "tennis" | "pickleball";
export interface Sport {
  key: SportKey; label: string;
  /** routes for this sport's screens */
  home: string; matches: string; record: string; rankings: string; h2h: string; challenges: string;
  /** what a unit of scoring is called (tennis plays sets, pickleball plays games) */
  unit: "set" | "game";
}
export const SPORTS: Record<SportKey, Sport> = {
  tennis: { key: "tennis", label: "Tennis", home: "/home", matches: "/matches", record: "/record", rankings: "/rankings", h2h: "/h2h", challenges: "/challenges", unit: "set" },
  pickleball: { key: "pickleball", label: "Pickleball", home: "/pickleball", matches: "/pickleball/matches", record: "/pickleball/record", rankings: "/pickleball/rankings", h2h: "/pickleball/h2h", challenges: "/pickleball/challenges", unit: "game" },
};
export const SPORT_LIST: Sport[] = [SPORTS.tennis, SPORTS.pickleball];
export const SPORT_COOKIE = "baseline_sport";
export const isSport = (s: unknown): s is SportKey => s === "tennis" || s === "pickleball";

const SCREENS = ["home", "matches", "record", "rankings", "h2h", "challenges"] as const;
/** The sport a path belongs to, or null for shared screens (players, settings). */
export function sportOfPath(path: string): SportKey | null {
  if (path === "/pickleball" || path.startsWith("/pickleball/")) return "pickleball";
  return SCREENS.some((k) => path === SPORTS.tennis[k] || path.startsWith(`${SPORTS.tennis[k]}/`)) ? "tennis" : null;
}
/** The same screen in another sport (Rankings → Rankings); shared screens keep their path with ?sport=. */
export function equivalentPath(path: string, to: SportKey): string {
  const from = sportOfPath(path);
  if (!from) return `${path}?sport=${to}`;
  const screen = SCREENS.find((k) => path === SPORTS[from][k] || (SPORTS[from][k] !== "/pickleball" && path.startsWith(`${SPORTS[from][k]}/`))) ?? "home";
  return SPORTS[to][screen];
}
