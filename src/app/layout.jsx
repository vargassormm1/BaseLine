import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";
import { PendingMatchProvider } from "../context/PendingMatchContext";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "BaseLine App",
  description: "Tennis App by Ralph Sormillon Vargas",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <div className="container">
            <PendingMatchProvider>
              <Navbar />
              {children}
              <SpeedInsights />
            </PendingMatchProvider>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
