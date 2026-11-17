import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { axe, noSidewaysScroll, signIn, watch } from "./helpers";
import { resetFixtures } from "./global-setup";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => { await resetFixtures(); });

test("signed out: the landing page is public, everything else is closed", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Every match counts." })).toBeVisible();
  await axe(page);
  for (const path of ["/home", "/rankings", "/players/ana_e2e", "/h2h", "/record", "/matches/00000000-0000-4000-8000-0000000000f1"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/sign-in(\?next=.*)?$/);
    await expect(page.getByRole("heading", { name: "Step on court." })).toBeVisible();
    expect(await page.content(), path).not.toContain("Ana Reyes");
  }
  await axe(page);
  expect(problems).toEqual([]);
});

test("security headers and a nonce-based CSP are on every page", async ({ request }) => {
  const r = await request.get("/");
  const h = r.headers();
  expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("home: athlete card, what needs me, confirm a result Ben recorded", async ({ page }) => {
  const problems = watch(page);
  await signIn(page, "ana");
  const card = page.getByRole("region", { name: "Your standing" });
  await expect(card).toContainText("Rank");
  await expect(card.getByRole("link", { name: "Record match" })).toBeVisible();
  await expect(page.getByText("Ben recorded a result. Is it right?")).toBeVisible();
  await axe(page);
  await noSidewaysScroll(page);
  await page.getByRole("button", { name: "Confirm" }).first().click();
  await expect(page.getByRole("status")).toHaveText("Confirmed. Points are in.");
  await page.reload();
  await expect(page.getByText("Ben recorded a result. Is it right?")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("record a match, the opponent confirms, the points count", async ({ browser, page }) => {
  const problems = watch(page);
  await signIn(page, "ana");
  await page.goto("/rankings");
  const pts = async (p = page) => Number(await p.locator("li", { hasText: "Ana Reyes" }).first().locator(".score").last().textContent());
  const before = await pts();

  await page.goto("/record");
  await page.getByRole("searchbox").or(page.getByPlaceholder("Search players")).fill("dee");
  await page.getByRole("button", { name: /Dee Marsh/ }).click();
  await page.getByRole("radio", { name: /^1 set/ }).click();
  await page.getByRole("radio", { name: "I won it" }).click();
  await page.getByRole("radio", { name: "6–3" }).click();
  await expect(page.getByText(/You win · \+5 pts/)).toBeVisible();
  await page.getByPlaceholder(/bragging rights/).fill("e2e run");
  await axe(page);
  await page.getByRole("button", { name: "Send to Dee to confirm" }).click();
  await expect(page).toHaveURL(/\/matches\/[0-9a-f-]{36}\?recorded=1$/);
  await expect(page.getByText("Waiting for Dee to confirm")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Ana Reyes def. Dee Marsh");
  await page.goto("/rankings");
  expect(await pts()).toBe(before); // not counted until Dee confirms

  const dee = await browser.newContext(); const dp = await dee.newPage();
  await signIn(dp, "dee");
  await expect(dp.getByText("Ana recorded a result. Is it right?")).toBeVisible();
  await dp.getByRole("button", { name: "Confirm" }).first().click();
  await expect(dp.getByRole("status")).toHaveText("Confirmed. Points are in.");
  await dee.close();

  await page.goto("/rankings");
  expect(await pts()).toBe(before + 5);
  expect(problems).toEqual([]);
});

test("score entry: tiebreaks, a third set only at one set all, live validation", async ({ page }) => {
  await signIn(page, "ana");
  await page.goto("/record");
  await page.getByRole("radio", { name: "Ben" }).click();
  await page.getByRole("radio", { name: /^Best of 3/ }).click();
  const set = (n: number) => page.getByRole("listitem").filter({ hasText: n === 3 ? /Set 3|Match tiebreak/ : `Set ${n}` });
  await expect(set(3)).toHaveCount(0);
  await set(1).getByRole("radio", { name: "I won it" }).click();
  await set(1).getByRole("radio", { name: "7–6" }).click();
  await expect(set(1).getByText(/Tiebreak: loser's points/)).toBeVisible();
  await set(2).getByRole("radio", { name: /Ben won it/ }).click();
  await set(2).getByRole("radio", { name: "6–4" }).click();
  await expect(set(3)).toHaveCount(1); // one set all → a decider appears
  await expect(page.getByRole("button", { name: "Send to Ben to confirm" })).toBeDisabled();
  await page.getByLabel(/match tiebreak/).check();
  await expect(page.getByText("Match tiebreak", { exact: true })).toBeVisible();
  await set(3).getByRole("radio", { name: "I won it" }).click();
  await expect(page.getByText(/You win · \+10 pts/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send to Ben to confirm" })).toBeEnabled();
});

test("challenges: accept Cy's challenge, then it's on", async ({ page }) => {
  const problems = watch(page);
  await signIn(page, "ana");
  await page.goto("/challenges");
  await expect(page.getByText("“Rematch. Saturday morning?”")).toBeVisible();
  await axe(page);
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByRole("status")).toHaveText("Challenge accepted. Go play!");
  await page.reload();
  await expect(page.getByRole("heading", { name: "On: play and record" })).toBeVisible();
  await page.getByRole("link", { name: "Record result" }).click();
  await expect(page).toHaveURL(/\/record\?challenge=/);
  await expect(page.getByText("Cy Lindqvist")).toBeVisible();
  await expect(page.getByRole("radio", { name: /^1 set/ })).toBeDisabled(); // the challenge fixes the format
  expect(problems).toEqual([]);
});

test("every screen loads cleanly, accessibly and without sideways scrolling", async ({ page }) => {
  const problems = watch(page);
  await signIn(page, "ana");
  for (const path of ["/home", "/matches", "/matches?who=all", "/rankings", "/rankings?season=2026", "/players", "/players/ana_e2e", "/players/cy_e2e", "/h2h", "/h2h?a=ana_e2e&b=cy_e2e", "/challenges", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first(), path).toBeAttached();
    await axe(page);
    await noSidewaysScroll(page);
  }
  expect(problems).toEqual([]);
});

test("head to head is the matchup between the two players", async ({ page }) => {
  await signIn(page, "ana");
  await page.goto("/h2h?a=ana_e2e&b=cy_e2e");
  const box = page.getByRole("region", { name: /Ana Reyes versus Cy Lindqvist/ });
  await expect(box).toBeVisible();
  await expect(page.getByRole("heading", { name: "Every meeting" })).toBeVisible();
});

test("a new player picks a username first", async ({ page }) => {
  await page.goto("/e2e/sign-in?u=newbie");
  await expect(page).toHaveURL(/\/welcome$/);
  await page.getByLabel("Invite code").fill("NOPE-NOPE-NOPE");
  await page.getByLabel("Username").fill("newbie_e2e");
  await page.getByRole("button", { name: "Let's play" }).click();
  await expect(page.getByText(/invite code isn.t valid/)).toBeVisible();
  await page.getByLabel("Invite code").fill("test-invi-te23");
  await page.getByLabel("Username").fill("a b");
  await page.getByRole("button", { name: "Let's play" }).click();
  await expect(page.getByLabel("Username")).toHaveJSProperty("validity.valid", false);
  await page.getByLabel("Username").fill("newbie_e2e");
  await page.getByRole("button", { name: "Let's play" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText("No matches yet").first()).toBeVisible();
});

test("theme: switching to light sticks across pages", async ({ page }) => {
  await signIn(page, "ana");
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Light" }).click();
  await page.goto("/home");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await axe(page);
});

test("someone else's pending result, an unknown match and a bad id all show not found (no data)", async ({ page }) => {
  // a pending result between Ana and Ben (Cy must not see it)
  const db = postgres("postgresql://postgres:postgres@127.0.0.1:55322/postgres", { max: 1, onnotice: () => {} });
  const [m] = await db`insert into public.matches (format, player_one, player_two, winner_id, status, played_on, points_awarded, note)
    values (1, '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', 'pending', current_date, 5, 'e2e private') returning id`;
  await db`insert into public.match_sets values (${m!.id}, 1, 6, 2, null, null, false)`;
  await db.end();
  await signIn(page, "cy");
  // (pages stream behind a loading state, so the status is already 200; what matters is that nothing leaks)
  for (const path of [`/matches/${m!.id}`, "/matches/00000000-0000-4000-8000-0000000000ff", "/matches/not-a-uuid"]) {
    await page.goto(path);
    await expect(page.getByText("That page isn't on the court."), path).toBeVisible();
    await expect(page.getByRole("region", { name: "Score" }), path).toHaveCount(0);
    expect(await page.content(), path).not.toContain("e2e private");
  }
  await signIn(page, "ana");
  await page.goto(`/matches/${m!.id}`);
  await expect(page.getByRole("region", { name: "Score" })).toBeVisible(); // but Ana (a player in it) can
});

test("a V1 player's first Google sign-in links their history (no invite, no welcome)", async ({ page }) => {
  await page.goto("/e2e/sign-in?u=claimer"); // claimer@e2e.test = the email on file for Fay, who isn't linked yet
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("region", { name: "Your standing" })).toBeVisible();
  await expect(page.getByText("Hi Fay")).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByText("claimer@e2e.test")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("matches: my scorecards by month, everyone's results, and the recorded confirmation", async ({ page }) => {
  await signIn(page, "ana");
  await page.goto("/matches");
  await expect(page.getByRole("link", { name: "Mine" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("main section h2").first()).toHaveText(/^[A-Z][a-z]+ 20\d\d$/);
  await page.getByRole("link", { name: "Everyone" }).click();
  await expect(page).toHaveURL(/who=all/);
  await expect(page.getByRole("link", { name: "Show more" })).toBeVisible();
});
