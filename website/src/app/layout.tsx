import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://codethon-cli.vercel.app";

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
  metadataBase: new URL(siteUrl),
  title: {
    default: "CodeThon CLI - AI Builder Agent for Hackathons and Shipping",
    template: "%s | CodeThon CLI",
  },
  description:
    "CodeThon CLI is an open-source AI builder agent for teams that need to plan, build, debug, profile, and ship software from the terminal.",
  keywords: [
    "CodeThon CLI",
    "AI coding agent",
    "open source coding agent",
    "terminal AI agent",
    "hackathon builder CLI",
    "developer tools",
    "AI pair programmer",
    "Claude Code alternative",
    "Codex CLI alternative",
    "provider agnostic AI CLI",
  ],
  authors: [{ name: "CodeThon CLI" }],
  creator: "CodeThon CLI",
  publisher: "CodeThon CLI",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "CodeThon CLI - AI Builder Agent for Hackathons and Shipping",
    description:
      "Plan, build, debug, profile, recover, and ship from one OLED-dark terminal workspace.",
    url: "/",
    siteName: "CodeThon CLI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeThon CLI - AI Builder Agent",
    description:
      "An open-source terminal agent for builders who need to turn ideas into shipped software.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="relative min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
