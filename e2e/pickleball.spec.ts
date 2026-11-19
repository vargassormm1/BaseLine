// Pickleball journeys on phone and desktop (local test mode, fictional players only).
import { expect, test, type Browser, type Page } from "@playwright/test";
import { axe, noSidewaysScroll, signIn, watch } from "./helpers";
import { resetFixtures } from "./global-setup";

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => { await resetFixtures(); });

const pick = async (page: Page, label: RegExp, name: string) => {
  await page.getByRole("textbox", { name: label }).fill(name);
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).first().click();
};
const as = async (browser: Browser, who: string) => { const ctx = await browser.newContext(); const p = await ctx.newPage(); await signIn(p, who); return { p, ctx }; };
const tennisPoints = async (page: Page) => { await page.goto("/rankings"); return page.locator("main ol").first().innerText(); };

test("every pickleball screen loads cleanly, accessibly and without sideways scrolling", async ({ page }) => {
  const problems = watch(page);
  await signIn(page, "ana");
  for (const path of ["/pickleball", "/pickleball/record", "/pickleball/rankings", "/pickleball/rankings?board=doubles", "/pickleball/matches", "/pickleball/h2h",
    "/pickleball/h2h?mode=teams", "/pickleball/h2h?mode=opponents", "/pickleball/challenges", "/players/ana_e2e?sport=pickleball"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first(), path).toBeAttached();
    await axe(page);
    await noSidewaysScroll(page);
  }
  expect(problems).toEqual([]);
});

test("the sport switcher keeps you on the same screen and the nav follows the sport", async ({ page }) => {
  await signIn(page, "ana");
  await page.goto("/rankings");
  await page.getByRole("navigation", { name: "Sport" }).getByRole("link", { name: "Pickleball" }).click();
  await expect(page).toHaveURL(/\/pickleball\/rankings$/);
  await expect(page.getByRole("heading", { name: "Pickleball rankings" })).toBeVisible();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Matches" }).first().click();
  await expect(page).toHaveURL(/\/pickleball\/matches/);
  await page.getByRole("navigation", { name: "Sport" }).getByRole("link", { name: "Tennis" }).click();
  await expect(page).toHaveURL(/\/matches$/);
  // the last sport is remembered for the app's entry
  await page.goto("/pickleball");
  await page.goto("/start");
  await expect(page).toHaveURL(/\/pickleball$/);
});

test("singles: record 11–8, the opponent confirms, the singles board updates; tennis doesn't change", async ({ page, browser }) => {
  await signIn(page, "ana");
  const before = await tennisPoints(page);
  await page.goto("/pickleball/record");
  await pick(page, /search for opponent/i, "Ben");
  await page.getByRole("textbox", { name: "Game 1, you" }).fill("11");
  await page.getByRole("textbox", { name: "Game 1, opponents" }).fill("10");
  await expect(page.getByRole("alert").filter({ hasText: /won by 2/ })).toBeVisible(); // 11–10 isn't a finished game
  await expect(page.getByRole("button", { name: "Send for confirmation" })).toBeDisabled();
  await page.getByRole("textbox", { name: "Game 1, opponents" }).fill("8");
  await expect(page.getByRole("complementary", { name: "Review" })).toContainText("Ana");
  await page.getByRole("button", { name: "Send for confirmation" }).click();
  await expect(page).toHaveURL(/\/pickleball\/matches\/[0-9a-f-]+\?recorded=1$/);
  await expect(page.getByText(/Match recorded/)).toBeVisible();

  const ben = await as(browser, "ben");
  await ben.p.goto("/pickleball");
  await ben.p.getByRole("button", { name: "Confirm" }).first().click();
  await expect(ben.p.getByText("Confirmed. Points are in.")).toBeVisible();
  await ben.ctx.close();

  await page.goto("/pickleball/rankings?board=singles");
  const first = page.locator("main ol li").first();
  await expect(first).toContainText("Ana");
  await expect(first).toContainText("5");
  expect(await tennisPoints(page)).toBe(before);
});

test("doubles: 2 vs 2, best of 3, either opponent confirms, both winners get 10 on the doubles board", async ({ page, browser }) => {
  await signIn(page, "ana");
  await page.goto("/pickleball/record");
  await page.getByRole("button", { name: /Doubles/ }).click();
  await pick(page, /search for your partner/i, "Cy");
  await pick(page, /search for opponent 1/i, "Ben");
  await pick(page, /search for opponent 2/i, "Dee");
  await page.getByRole("button", { name: "Best of 3 to 11" }).click();
  for (const [i, a, b] of [[1, "11", "9"], [2, "8", "11"], [3, "11", "7"]] as const) {
    await page.getByRole("textbox", { name: `Game ${i}, your team` }).fill(a);
    await page.getByRole("textbox", { name: `Game ${i}, opponents` }).fill(b);
  }
  await expect(page.getByRole("complementary", { name: "Review" })).toContainText("Ana & Cy");
  await page.getByRole("button", { name: "Send for confirmation" }).click();
  await expect(page).toHaveURL(/\/pickleball\/matches\/[0-9a-f-]+\?recorded=1$/);

  const dee = await as(browser, "dee");
  await dee.p.goto("/pickleball");
  await dee.p.getByRole("button", { name: "Confirm" }).first().click();
  await expect(dee.p.getByText("Confirmed. Points are in.")).toBeVisible();
  await dee.ctx.close();

  await page.goto("/pickleball/rankings?board=doubles");
  const rows = page.locator("main ol li");
  await expect(rows.nth(0)).toContainText("10");
  await expect(rows.nth(1)).toContainText("10");
  await expect(page.locator("main ol")).toContainText("Ana");
  await expect(page.locator("main ol")).toContainText("Cy");
  // the doubles result is not a singles head-to-head
  await page.goto("/pickleball/h2h?a=ana_e2e&b=ben_e2e");
  await expect(page.locator("main")).toContainText("1–0");
  await page.goto("/pickleball/h2h?mode=opponents&a=ana_e2e&b=ben_e2e");
  await expect(page.locator("main")).toContainText("1–0");
});
