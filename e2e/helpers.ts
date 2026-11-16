import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
export const signIn = async (page: Page, who: string) => { await page.goto(`/e2e/sign-in?u=${who}`); await expect(page).toHaveURL(/\/home$/); };
/** No console errors (the browser's automatic favicon.ico request is ignored), and no serious accessibility issues. */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.location().url) && !/Failed to load resource.*404/.test(m.text())) problems.push(`console: ${m.text()}`); });
  page.on("response", (r) => { if (r.status() >= 500) problems.push(`http ${r.status()} ${r.url()}`); });
  return problems;
}
export async function axe(page: Page) {
  // let entrance animations finish first (half-faded text would read as low contrast)
  await page.waitForFunction(() => document.getAnimations().every((x) => x.playState !== "running" || x.effect?.getTiming().iterations === Infinity));
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
}
export async function noSidewaysScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}
