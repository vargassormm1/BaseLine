import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { axe, noSidewaysScroll, signIn, watch } from "./helpers";
import { resetFixtures } from "./global-setup";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => { await resetFixtures(); });

test("signed out: the landing page is public, everything else is closed", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The match ends. The rivalry doesn't." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join with an invite" }).first()).toHaveAttribute("href", "/sign-in?next=/welcome");
  await expect(page.getByText(/^Invite-only:/)).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await axe(page);
  await noSidewaysScroll(page);
  for (const path of ["/home", "/rankings", "/players/ana_e2e", "/h2h", "/record", "/matches/00000000-0000-4000-8000-0000000000f1"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/sign-in(\?next=.*)?$/);
    await expect(page.getByRole("heading", { name: "Game on." })).toBeVisible();
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

test("profile photo: initials until a player uploads their own; it can be removed again", async ({ page }) => {
  const problems = watch(page);
  await signIn(page, "dee");
  await page.goto("/settings");
  // a real 400×300 PNG, drawn in the browser (gets center-cropped to a 256px square WebP before upload)
  const dataUrl = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 400; c.height = 300; const g = c.getContext("2d")!; g.fillStyle = "#4263eb"; g.fillRect(0, 0, 400, 300); g.fillStyle = "#fff"; g.fillRect(150, 100, 100, 100); return c.toDataURL("image/png"); });
  const png = Buffer.from(dataUrl.split(",")[1]!, "base64");
  await page.locator("#photo-file").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("Photo updated.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Change photo" })).toBeVisible();
  await page.goto("/players/dee_e2e");
  await expect(page.locator("header img")).toHaveAttribute("src", /\/storage\/v1\/object\/public\/avatars\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/);
  expect(await page.locator("header img").evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(256);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Photo removed.")).toBeVisible();
  await page.goto("/players/dee_e2e");
  await expect(page.locator("header img")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("no sideways scrolling from 320px to 1440px, portrait and landscape, with a very long name", async ({ browser }) => {
  test.skip(test.info().project.name !== "phone", "one sweep is enough");
  test.setTimeout(180_000);
  const db = postgres("postgresql://postgres:postgres@127.0.0.1:55322/postgres", { max: 1, onnotice: () => {} });
  await db`update public.players set first_name = 'Maximiliano-Alexander', last_name = 'Featherstonehaugh-Wolfeschlegelstein' where username = 'cy_e2e'`;
  try {
    for (const [width, height] of [[320, 568], [360, 740], [390, 844], [430, 932], [568, 320], [844, 390], [768, 1024], [1024, 768], [1440, 900]] as const) {
      const ctx = await browser.newContext({ viewport: { width, height }, baseURL: test.info().project.use.baseURL! });
      const page = await ctx.newPage();
      for (const path of ["/", "/sign-in"]) { await page.goto(path); await noSidewaysScroll(page); }
      await page.goto("/e2e/sign-in?u=ana");
      for (const path of ["/home", "/matches", "/rankings", "/record", "/challenges", "/players", "/players/cy_e2e", "/h2h?a=ana_e2e&b=cy_e2e", "/settings"]) {
        await page.goto(path);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px ${path}`).toBeLessThanOrEqual(0);
      }
      await ctx.close();
    }
  } finally {
    await db`update public.players set first_name = 'Cy', last_name = 'Lindqvist' where username = 'cy_e2e'`;
    await db.end();
  }
});

test("navigation: a tapped tab responds at once, even on a slow connection; going back is instant", async ({ page }) => {
  await signIn(page, "ana");
  await page.waitForLoadState("networkidle");
  // make every page request slow (1.2 s), so only immediate feedback can pass
  await page.route("**/*", async (route) => {
    const r = route.request();
    if (r.headers()["rsc"] && !r.headers()["next-router-prefetch"]) await new Promise((f) => setTimeout(f, 1200));
    await route.continue();
  });
  const nav = page.getByRole("navigation", { name: "Main" }).first();
  const rankings = nav.getByRole("link", { name: "Rankings" });
  const t0 = Date.now();
  await rankings.click();
  await expect(rankings).toHaveAttribute("aria-current", "page", { timeout: 300 }); // lit before the server answers
  expect(Date.now() - t0).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Rankings", level: 1 })).toBeVisible();
  // back to Home within 30 s: served from the browser's cache, no waiting on the slow network
  const t1 = Date.now();
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("region", { name: "Your standing" })).toBeVisible({ timeout: 600 });
  expect(Date.now() - t1).toBeLessThan(800);
});

test("phone: settings and the invite link are reachable without the desktop rail", async ({ page }) => {
  test.skip(test.info().project.name !== "phone", "the rail covers desktop");
  await signIn(page, "ana");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("button", { name: "Create invite link" })).toBeVisible();
  await page.getByRole("link", { name: "Me", exact: true }).click();
  await page.getByRole("link", { name: "Invite a friend" }).click();
  await expect(page).toHaveURL(/\/settings#invite$/);
  await expect(page.getByRole("button", { name: "Create invite link" })).toBeInViewport();
});

// ---- email + password accounts (real local Supabase Auth; emails caught by the local Mailpit) ----------------------
const MAILPIT = "http://127.0.0.1:55324/api/v1";
async function emailLink(to: string, subject: RegExp): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const list = await (await fetch(`${MAILPIT}/search?query=${encodeURIComponent(`to:"${to}"`)}`)).json() as { messages: { ID: string; Subject: string }[] };
    const m = list.messages.find((x) => subject.test(x.Subject));
    if (m) {
      const html = (await (await fetch(`${MAILPIT}/message/${m.ID}`)).json() as { HTML: string }).HTML;
      const href = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(html)?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no "${subject}" email for ${to}`);
}

test("email sign-up: confirm by link, join with an invite, sign back in, reset the password", async ({ page }) => {
  const { resetEmailAccounts } = await import("./global-setup");
  await resetEmailAccounts();
  const addr = `pat-${test.info().project.name}@mail.e2e.test`;

  // the invite link opens "Create account"
  await page.goto("/join/EMAI-LINV-ITE1");
  await expect(page.getByRole("tab", { name: "Create account" })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Email").fill(addr);
  await page.getByLabel("Password").fill("short1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /./ })).toHaveText(/at least 10 characters/);
  await page.getByLabel("Password").fill("rally-point-2026");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  // can't sign in before confirming; the same answer for an address that's already taken (no account probing)
  await page.getByRole("button", { name: "Back to sign in" }).click();
  await page.getByLabel("Email").fill(addr);
  await page.getByLabel("Password").fill("rally-point-2026");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /./ })).toHaveText(/Confirm your email first/);

  await page.goto(await emailLink(addr, /Confirm your email/));
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByLabel("Invite code")).toHaveValue("EMAILINVITE1");
  await page.getByLabel("Username").fill(`pat_${test.info().project.name}`);
  await page.getByLabel("First name").fill("Pat");
  await page.getByLabel("Last name").fill("Mailer");
  await page.getByRole("button", { name: "Let's play" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText("Hi Pat")).toBeVisible();

  // a used confirmation link doesn't work twice
  await page.context().clearCookies();
  await page.goto(await emailLink(addr, /Confirm your email/));
  await expect(page).toHaveURL(/\/sign-in\?error=link$/);
  await expect(page.getByRole("alert").filter({ hasText: /./ })).toHaveText(/expired or was already used/);

  // wrong password, then forgot password → new password → in
  await page.getByLabel("Email").fill(addr);
  await page.getByLabel("Password").fill("not-the-password-1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#email-form").getByRole("alert")).toHaveText("That email and password don't match.");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Email").fill(addr);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
  await page.goto(await emailLink(addr, /Reset your/));
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel("New password").fill("second-serve-77");
  await page.getByLabel("Type it again").fill("second-serve-78");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /./ })).toHaveText("The passwords don't match.");
  await page.getByLabel("New password").fill("second-serve-77");
  await page.getByLabel("Type it again").fill("second-serve-77");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(addr);
  await page.getByLabel("Password").fill("second-serve-77");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test("an unknown email gets the same 'check your email' answer for sign-up and reset", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Email").fill("nobody@mail.e2e.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();
});
