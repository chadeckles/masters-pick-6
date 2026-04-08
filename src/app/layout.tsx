import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { CURRENT_YEAR } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `Masters Pick 6 — ${CURRENT_YEAR} Office Pool`,
  description:
    `Pick 6 golfers across 4 tiers for the ${CURRENT_YEAR} Masters Tournament. Best 5 of 6 scores win. Live ESPN scoring.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="bg-masters-green-dark text-white/50 py-6">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <p>Masters Pick 6 © {CURRENT_YEAR} — Not affiliated with Augusta National Golf Club</p>
            <p>Live scoring powered by ESPN • Rankings via OWGR</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
