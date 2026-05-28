"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TerminalWindow } from "@/components/ui/terminal-window";
import { Badge } from "@/components/ui/badge";
import { CardGlow } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SPINNER_FRAMES = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];

type LineType =
  | "separator"
  | "command"
  | "info"
  | "agent"
  | "spinner"
  | "error"
  | "success"
  | "goal"
  | "empty"
  | "cursor";

interface LineDef {
  type: LineType;
  text?: string;
  agent?: "architect" | "research";
}

const LINES: LineDef[] = [
  { type: "command", text: '$ ct execute "build a SaaS landing page"' },
  { type: "empty" },
  { type: "info", text: "○ Loading project context...  [12 files detected]" },
  {
    type: "info",
    text: "○ Analyzing tech stack...  [Next.js + Tailwind + TypeScript]",
  },
  { type: "info", text: "○ Generating execution plan..." },
  { type: "separator" },
  {
    type: "agent",
    agent: "architect",
    text: "● Designing component architecture...",
  },
  {
    type: "agent",
    agent: "architect",
    text: "✓ Architecture approved — 8 components planned",
  },
  {
    type: "agent",
    agent: "research",
    text: "● Searching best practices for landing page...",
  },
  { type: "agent", agent: "research", text: "✓ Found 12 relevant patterns" },
  { type: "separator" },
  { type: "info", text: "○ Writing src/components/hero.tsx..." },
  { type: "info", text: "○ Writing src/components/features.tsx..." },
  { type: "info", text: "○ Writing src/components/cta.tsx..." },
  { type: "info", text: "○ Writing src/app/page.tsx..." },
  { type: "separator" },
  { type: "command", text: "$ npm run build" },
  { type: "spinner", text: "Building..." },
  { type: "error", text: "✕ Build failed — 2 errors" },
  { type: "empty" },
  { type: "info", text: "○ Auto-fixing error in src/components/hero.tsx..." },
  {
    type: "info",
    text: "○ Auto-fixing error in src/components/features.tsx...",
  },
  { type: "spinner", text: "Rebuilding..." },
  { type: "separator" },
  { type: "success", text: "✓ Build passed — 0 errors" },
  { type: "success", text: "✓ All 8 components verified" },
  { type: "goal", text: "★ Goal met — Landing page deployed in 47.3s" },
  { type: "separator" },
  { type: "empty" },
  { type: "cursor" },
];

const LINE_DELAY = 600;
const RESTART_DELAY = 4000;

function renderLine(line: LineDef, spinner: string) {
  switch (line.type) {
    case "command":
      return <span className="text-cyan-400">{line.text}</span>;
    case "info": {
      const icon = line.text!.charAt(0);
      return (
        <span>
          <span className="text-cyan-400">{icon}</span>
          <span className="text-gray-300">{line.text!.slice(1)}</span>
        </span>
      );
    }
    case "agent": {
      const icon = line.text!.charAt(0);
      const message = line.text!.slice(1);
      const iconColor =
        icon === "●" ? "text-yellow-400" : "text-green-400";
      const agentColor =
        line.agent === "architect" ? "text-cyan-400" : "text-purple-400";
      const agentLabel =
        line.agent === "architect"
          ? "Architect Agent"
          : "Research Agent";
      return (
        <span>
          <span className={agentColor}>[{agentLabel}]</span>
          {"   "}
          <span className={iconColor}>{icon}</span>
          <span className="text-gray-300">{message}</span>
        </span>
      );
    }
    case "spinner":
      return (
        <span>
          <span className="text-yellow-400">{spinner}</span>
          <span className="text-gray-300"> {line.text}</span>
        </span>
      );
    case "error":
      return <span className="text-red-400">{line.text}</span>;
    case "success":
      return <span className="text-green-400">{line.text}</span>;
    case "goal":
      return <span className="text-cyan-400">{line.text}</span>;
    case "separator":
      return (
        <span className="block text-white/10 select-none">
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        </span>
      );
    case "empty":
      return <span className="block h-4" />;
    case "cursor":
      return (
        <span className="text-cyan-400">
          ct execute{" "}
          <span className="inline-block w-2 h-4 bg-cyan-400 animate-terminal-blink" />
        </span>
      );
    default:
      return null;
  }
}

const BOTTOM_STATS = [
  { value: "8", label: "Components Generated" },
  { value: "47.3s", label: "Total Execution" },
  { value: "2", label: "Errors Auto-Fixed" },
  { value: "1", label: "Goal Met" },
];

export function TerminalShowcase() {
  const [revealedCount, setRevealedCount] = useState(1);
  const [spinnerIndex, setSpinnerIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpinnerIndex((p) => (p + 1) % SPINNER_FRAMES.length);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (revealedCount >= LINES.length) return;
    const timer = setTimeout(
      () => setRevealedCount((p) => p + 1),
      LINE_DELAY
    );
    return () => clearTimeout(timer);
  }, [revealedCount]);

  useEffect(() => {
    if (revealedCount < LINES.length) return;
    const timer = setTimeout(() => setRevealedCount(1), RESTART_DELAY);
    return () => clearTimeout(timer);
  }, [revealedCount]);

  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[900px] h-[900px] rounded-full bg-cyan-500/10 blur-[180px]" />
        <div className="w-[700px] h-[700px] rounded-full bg-purple-500/10 blur-[180px] -translate-x-48 translate-y-24" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <Badge variant="cyan">Live Execution</Badge>
          <h2 className="text-gradient text-4xl md:text-6xl font-bold mt-4 tracking-tight">
            See It In Action
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="glow rounded-xl">
            <TerminalWindow
              title={'ct execute "build a SaaS landing page"'}
              className="min-h-[520px] md:min-h-[620px] shadow-2xl"
            >
              <div className="space-y-0.5">
                {LINES.slice(0, revealedCount).map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    {renderLine(line, SPINNER_FRAMES[spinnerIndex])}
                  </motion.div>
                ))}
              </div>
            </TerminalWindow>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10"
        >
          {BOTTOM_STATS.map((stat) => (
            <CardGlow
              key={stat.label}
              className="text-center py-5 px-4"
            >
              <div className="text-2xl md:text-3xl font-bold text-white">
                {stat.value}
              </div>
              <div className="text-sm text-[#8888a0] mt-1">{stat.label}</div>
            </CardGlow>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

