# Baseline V2 — Product spec

The heart of it: a group of friends keeping score. Simple to log a match, fun to compare.

## Who
Invite-only. Sign-in is **Google** (through Supabase Auth). Every V1 player keeps their history: their first Google
sign-in with the same email links them automatically. New players join with a one-time invite link from an existing
player (expires in 14 days, works once).

## Screens
| Screen | What it does |
|---|---|
| Landing `/` | Public. What Baseline is, how points work. Signed-in players go straight to Home. |
| Home `/home` | Athlete card (all-time rank, points, record, win rate, season rank, form, streak) · **Your move** (results to confirm, challenges to answer, accepted challenges to record) · rivals with head-to-head records · recent matches · top of the table. |
| Rankings `/rankings` | All-time and per season (calendar year). Rank, 7-day movement, record, win %, form, points. |
| Record `/record` | Opponent (recent first, search) · format · when (today/yesterday/date) · score by tapping: who won each set, then the score; tiebreak loser's points (winner's follow). Sets appear only as needed. Live scoreboard and validation. Sends to the opponent to confirm. |
| Match `/matches/[id]` | Scoreboard, status. Opponent: confirm / not right. Recorder: withdraw while pending. Admin: void (kept, marked void). |
| Challenges `/challenges` | Send (opponent, format, optional message, suggested date) · accept/decline · call off · record the result (opponent and format locked). |
| Players `/players` | Directory with search. |
| Profile `/players/[username]` | Athlete page: ranks, record, win/set/game %, tiebreaks, streaks, last 10, by format, achievements, rivals, history. |
| Head to head `/h2h` | Any two players: overall record, split bar, matches/sets/games/tiebreaks won, by format, biggest wins, every meeting; rematch. |
| Settings `/settings` | Profile (username, names), invite a friend, appearance (system/light/dark), rules, sign out. |

## Rules
**Recording.** Only one of the two players records a match, for themselves vs one opponent; it's *pending* until the
opponent confirms. Dates: within the last 365 days, not in the future. The opponent can confirm or reject; the recorder
can withdraw while pending. Confirmed results can only be voided by an admin, with a reason (kept, shown as void).
A result older than a year can't be confirmed (it can still be rejected or withdrawn). The same match (same pair,
day and score) twice needs an explicit "record anyway".

**Scores.** Formats: one set, best of 3, best of 5. A set ends at 6–0…6–4, 7–5, or 7–6 with a tiebreak (first to 7,
win by 2; past 7 it ends at a 2-point lead). Optionally the deciding set is a match tiebreak (first to 10, win by 2).
The match ends the moment someone wins the required sets. The server computes the winner. No retirements, walkovers
or doubles (not used by the group; see DECISIONS).

**Points and rankings.** Unchanged from V1: a confirmed win is worth 5 (one set), 10 (best of 3) or 20 (best of 5);
a loss costs nothing. The points are stored on the match when it's recorded, so a future rule change never rewrites
history. Rankings are derived from confirmed matches only: points, then wins, then win %, then fewer losses; equal
points/wins/losses share a rank. All-time includes the V1 carry-over (see MIGRATION); seasons are calendar years.
Movement: places gained/lost compared with the table 7 days ago.

**Challenges.** One open challenge per pair. Pending challenges expire after 14 days. Accepted → play → record with
the challenge (format must match) → completed when the result is confirmed. Either player can call off an accepted
challenge (unless a result is waiting).

**Achievements.** Derived, never stored: first win, 10/25/50 wins, bagel (a 6–0 set), hot streak (5 wins in a row),
clutch (5 tiebreaks), comeback (won after losing the first set), rivalry (10 matches vs one opponent).

## Not included (on purpose)
Messaging (V1's was removed; its two empty threads are kept in the legacy copy), Elo/skill ratings, leagues or
tournaments, doubles, scheduling/venues, notifications beyond in-app badges, public profiles.
