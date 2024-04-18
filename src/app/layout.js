import { ClerkProvider } from "@clerk/nextjs";
import { Roboto } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar/Navbar";
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
});

export const metadata = {
  title: "BaseLine App",
  description:
    "BaseLine is a web application tailored for tennis players, enabling them to sign up, log games, track points, and compare rankings. It simplifies the process of recording match outcomes and viewing player standings.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={roboto.className}>
          <div className="container">
            <Navbar />
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
