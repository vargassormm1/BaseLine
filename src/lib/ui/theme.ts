export type ThemePref = "system" | "light" | "dark";
export const THEME_COOKIE = "baseline-theme";
export const themeFrom = (v: string | undefined): ThemePref => (v === "light" || v === "dark" ? v : "system");
