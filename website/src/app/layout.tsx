import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CodeThon CLI \u2014 AI-Native Execution Orchestration",
  description:
    "An autonomous AI-native terminal platform that plans, builds, debugs, and ships software end-to-end through natural language commands and intelligent agent orchestration.",
  openGraph: {
    title: "CodeThon CLI \u2014 AI-Native Execution Orchestration",
    description:
      "An autonomous AI-native terminal platform that plans, builds, debugs, and ships software end-to-end through natural language commands and intelligent agent orchestration.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeThon CLI \u2014 AI-Native Execution Orchestration",
    description:
      "An autonomous AI-native terminal platform that plans, builds, debugs, and ships software end-to-end through natural language commands and intelligent agent orchestration.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="relative min-h-screen">
        <div className="fixed inset-0 grid-bg pointer-events-none" />
        {children}
      </body>
    </html>
  );
}
