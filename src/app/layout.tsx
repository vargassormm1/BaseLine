import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE, themeFrom } from "@/lib/ui/theme";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Baseline", template: "%s · Baseline" },
  description: "Your friends. Your league. Your legacy. Track every match, climb your own rankings. Starting with tennis.",
  applicationName: "Baseline",
  appleWebApp: { capable: true, title: "Baseline", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f7f8f4" }, { media: "(prefers-color-scheme: dark)", color: "#111514" }],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = themeFrom((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" className={archivo.variable} {...(theme !== "system" ? { "data-theme": theme } : {})} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
