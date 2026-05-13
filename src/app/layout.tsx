import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentOS Runtime — The Safety Layer for Autonomous Trading Agents",
  description:
    "Runtime observability, failure detection, and operational intelligence for autonomous on-chain AI agents. Preventing silent capital destruction in the agentic economy.",
  openGraph: {
    title: "AgentOS Runtime",
    description: "The safety layer for autonomous trading agents.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-[#030712] text-zinc-200 font-mono">{children}</body>
    </html>
  );
}
