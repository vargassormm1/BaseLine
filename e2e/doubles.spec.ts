// Tennis doubles journeys on phone and desktop (local test mode, fictional players only).
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
const singlesBoard = async (page: Page) => { await page.goto("/rankings"); return page.locator("main ol").first().innerText(); };

test("every doubles screen loads cleanly, accessibly and without sideways scrolling", async ({ page }) => {
  const problems = watch(page);
  await signIn(page, "ana");
  for (const path of ["/record?type=doubles", "/rankings?board=doubles", "/matches?type=doubles", "/matches?type=singles", "/h2h?mode=teams", "/h2h?mode=opponents",
    "/h2h?mode=partner", "/challenges?type=doubles", "/players/ana_e2e?sport=tennis&view=doubles", "/players/ana_e2e?sport=tennis"]) {
    await page.goto(path);
    await expect(page.locator("main h1").first(), path).toBeAttached();
    await axe(page);
    await noSidewaysScroll(page);
  }
  expect(problems).toEqual([]);
});

test("standard doubles 6–4 3–6 [10–7]: impossible scores blocked, either opponent confirms, both winners get 10; singles unchanged", async ({ page, browser }) => {
  await signIn(page, "ana");
  const before = await singlesBoard(page);
  await page.goto("/record?type=doubles");
  await pick(page, /search for your partner/i, "Cy");
  await pick(page, /search for opponent 1/i, "Ben");
  await pick(page, /search for opponent 2/i, "Dee");
  await page.getByRole("textbox", { name: "Set 1, your team" }).fill("6");
  await page.getByRole("textbox", { name: "Set 1, opponents" }).fill("5");
  await expect(page.getByRole("button", { name: "Send for confirmation" })).toBeDisabled(); // 6–5 isn't finished
  await page.getByRole("textbox", { name: "Set 1, opponents" }).fill("4");
  await page.getByRole("textbox", { name: "Set 2, your team" }).fill("3");
  await page.getByRole("textbox", { name: "Set 2, opponents" }).fill("6");
  await page.getByRole("textbox", { name: "Match tiebreak, your team" }).fill("10");
  await page.getByRole("textbox", { name: "Match tiebreak, opponents" }).fill("9");
  await expect(page.getByRole("button", { name: "Send for confirmation" })).toBeDisabled(); // 10–9 isn't won by 2
  await page.getByRole("textbox", { name: "Match tiebreak, opponents" }).fill("7");
  const review = page.getByRole("complementary", { name: "Review" });
  await expect(review).toContainText("6–4, 3–6, [10–7]");
  await expect(review).toContainText("10 to each winner");
  await page.getByRole("button", { name: "Send for confirmation" }).click();
  await expect(page).toHaveURL(/\/matches\/doubles\/[0-9a-f-]+\?recorded=1$/);
  await expect(page.getByText(/Match recorded/)).toBeVisible();

  // my partner can't confirm; an opponent (Dee) can, from Home
  const cy = await as(browser, "cy");
  await cy.p.goto(page.url().replace("?recorded=1", ""));
  await expect(cy.p.getByRole("button", { name: "Confirm" })).toHaveCount(0);
  await cy.ctx.close();
  const dee = await as(browser, "dee");
  await dee.p.goto("/home");
  await dee.p.getByRole("button", { name: "Confirm" }).first().click();
  await expect(dee.p.getByText("Confirmed. Points are in.")).toBeVisible();
  await dee.ctx.close();

  await page.goto("/rankings?board=doubles");
  const board = page.getByRole("list", { name: "Doubles rankings" });
  await expect(board.locator("li").nth(0)).toContainText("10");
  await expect(board.locator("li").nth(1)).toContainText("10");
  await expect(board).toContainText("Ana");
  await expect(board).toContainText("Cy");
  expect(await singlesBoard(page)).toBe(before);
  await page.goto("/matches?type=doubles");
  await expect(page.getByText("1 match")).toBeVisible();
});

test("team head to head treats the same partners in any order as one team", async ({ page }) => {
  await signIn(page, "ben");
  await page.goto("/h2h?mode=teams&a1=cy_e2e&a2=ana_e2e&b1=dee_e2e&b2=ben_e2e");
  await expect(page.getByRole("region", { name: /versus .*: 1 to 0/ })).toBeVisible();
  await page.goto("/h2h?mode=opponents&a=dee_e2e&b=ana_e2e");
  await expect(page.getByRole("region", { name: /: 0 to 1/ })).toBeVisible();
});

test("doubles challenge: Ben + Dee challenge Ana + Cy; Cy accepts; the result is pre-filled", async ({ page, browser }) => {
  await signIn(page, "ben");
  await page.goto("/challenges?type=doubles");
  await pick(page, /search for your partner/i, "Dee");
  await pick(page, /search for opponent 1/i, "Ana");
  await pick(page, /search for opponent 2/i, "Cy");
  await page.getByRole("button", { name: "Send doubles challenge" }).click();
  await expect(page.getByText("Challenge sent.")).toBeVisible();
  const cy = await as(browser, "cy");
  await cy.p.goto("/challenges?type=doubles");
  await cy.p.getByRole("button", { name: "Accept" }).first().click();
  await expect(cy.p.getByRole("link", { name: "Record result" })).toBeVisible();
  await cy.p.getByRole("link", { name: "Record result" }).click();
  await expect(cy.p).toHaveURL(/type=doubles&challenge=/);
  await expect(cy.p.getByText("Result of your doubles challenge.")).toBeVisible();
  await cy.ctx.close();
});
