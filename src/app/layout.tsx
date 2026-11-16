import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { THEME_COOKIE, themeFrom } from "@/lib/ui/theme";
import { e2eAuthEnabled } from "@/lib/server/env";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Baseline", template: "%s · Baseline" },
  description: "Log your tennis matches, climb the rankings, settle the rivalry.",
  applicationName: "Baseline",
  appleWebApp: { capable: true, title: "Baseline", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f2f1ea" }, { media: "(prefers-color-scheme: dark)", color: "#0d0f0c" }],
};

const clerkAppearance = {
  variables: { colorPrimary: "#d6f24a", colorTextOnPrimaryBackground: "#11140d", borderRadius: "14px", fontFamily: "var(--font-archivo)" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = themeFrom((await cookies()).get(THEME_COOKIE)?.value);
  const html = (
    <html lang="en" className={archivo.variable} {...(theme !== "system" ? { "data-theme": theme } : {})} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
  return e2eAuthEnabled() ? html : <ClerkProvider dynamic appearance={clerkAppearance}>{html}</ClerkProvider>;
}
