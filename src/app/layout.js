import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "BaseLine App",
  description: "Tennis App by Ralph Sormillon Vargas",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <div className="container">
            <Navbar />
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
