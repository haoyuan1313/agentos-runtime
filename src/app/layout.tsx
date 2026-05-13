import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentOS Runtime — Operational Intelligence for AI Agents",
  description:
    "Operator-grade runtime monitoring for autonomous on-chain AI agents. Hung execution detection, retry loop prevention, orchestration visibility, and on-chain transaction monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-zinc-950 text-zinc-200 font-mono">{children}</body>
    </html>
  );
}
