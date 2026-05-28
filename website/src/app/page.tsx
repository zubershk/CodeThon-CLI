"use client";

import { Hero } from "@/components/hero";
import { Trust } from "@/components/trust";
import Problem from "@/components/problem";
import Features from "@/components/features";
import { TerminalShowcase } from "@/components/terminal-showcase";
import { Architecture } from "@/components/architecture";
import { HowItWorks } from "@/components/how-it-works";
import { UseCases } from "@/components/use-cases";
import { DevExperience } from "@/components/dev-experience";
import { FinalCta } from "@/components/final-cta";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const handleSmoothScroll = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a[href^='#']");
      if (!target) return;
      const href = (target as HTMLAnchorElement).getAttribute("href");
      if (!href) return;
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };
    document.addEventListener("click", handleSmoothScroll);
    return () => document.removeEventListener("click", handleSmoothScroll);
  }, []);

  return (
    <main className="relative overflow-hidden">
      <Hero />
      <Trust />
      <Problem />
      <Features />
      <TerminalShowcase />
      <Architecture />
      <HowItWorks />
      <UseCases />
      <DevExperience />
      <FinalCta />

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-12">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2">
            <span className="text-cyan-400">◆</span>
            <span className="text-sm font-semibold text-white">CodeThon CLI</span>
          </div>
          <p className="text-sm text-[#8888a0]">
            AI-native execution orchestration for hackathons.
          </p>
          <p className="mt-2 text-xs text-[#8888a0]/60">
            Built during the OpenAI × Outskill AI Builders Hackathon
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-[#8888a0]/40">
            <a href="https://github.com/zubershk/CodeThon-CLI" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">GitHub</a>
            <span>MIT License</span>
            <span>v2.0</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
