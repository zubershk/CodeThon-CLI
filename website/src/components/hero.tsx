"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TerminalWindow } from "@/components/ui/terminal-window";

const terminalLines = [
  { text: "○ Planning execution strategy...", color: "text-cyan-400" },
  { text: "○ Searching documentation...", color: "text-cyan-400" },
  { text: "○ Writing files...", color: "text-cyan-400" },
  { text: "○ Running build...", color: "text-yellow-400" },
  { text: "✕ Build failed — 3 errors", color: "text-red-400" },
  { text: "○ Auto-fixing errors...", color: "text-yellow-400" },
  { text: "✓ Build passed", color: "text-green-400" },
  { text: "★ Goal met — Landing page deployed.", color: "text-cyan-300 font-semibold" },
];

const features = [
  "Autonomous Execution Loop",
  "Persistent REPL",
  "Multi-LLM Router",
  "Self-Healing Builds",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const terminalItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function Hero() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visibleLines < terminalLines.length) {
      const delay = 1000 + Math.random() * 500;
      const timer = setTimeout(() => setVisibleLines((p) => p + 1), delay);
      return () => clearTimeout(timer);
    }
  }, [visibleLines]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText("npm install -g codethon-cli");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-cyan-500/5 blur-[160px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl">
        <motion.div
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="flex flex-col gap-6" variants={itemVariants}>
            <motion.div variants={itemVariants}>
              <Badge variant="cyan" className="text-xs tracking-wider uppercase">
                v2.0 — Autonomous AI Execution
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight"
            >
              <span className="text-gradient">
                Your AI Engineering Teammate in the Terminal.
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-base sm:text-lg text-[#8888a0] max-w-lg leading-relaxed"
            >
              From idea to shipped product autonomously. CodeThon CLI plans, writes files, runs commands, fixes builds, searches docs, and loops until your goal is met — all from your terminal.
            </motion.p>

            <motion.ul variants={itemVariants} className="flex flex-col gap-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-[#a0a0b8]">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-cyan-400" />
                  </span>
                  {feature}
                </li>
              ))}
            </motion.ul>

            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-3 pt-2"
            >
              <Button variant="primary" size="lg">
                Install CLI
              </Button>
              <Button variant="secondary" size="lg">
                View on GitHub
              </Button>
            </motion.div>

            <motion.div variants={itemVariants} className="relative group">
              <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] border border-white/[0.06] px-4 py-3 font-mono text-sm">
                <span className="text-cyan-400">$</span>
                <code className="text-[#a0a0b8]">npm install -g codethon-cli</code>
                <button
                  onClick={handleCopy}
                  className="ml-auto flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[#8888a0] hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                  aria-label="Copy install command"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <code className="block mt-1.5 ml-[1.35rem] font-mono text-xs text-[#8888a0]">
                ct
              </code>
            </motion.div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10 rounded-2xl blur-2xl opacity-60 animate-glow-pulse" />
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5 rounded-2xl blur-xl opacity-40" />

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            >
              <TerminalWindow
                title={'ct execute "build a landing page with auth"'}
                className="relative z-10"
              >
                <div className="space-y-1.5 min-h-[240px]">
                  <AnimatePresence>
                    {terminalLines.slice(0, visibleLines).map((line, i) => (
                      <motion.div
                        key={i}
                        variants={terminalItemVariants}
                        initial="hidden"
                        animate="visible"
                        className={cn("text-xs sm:text-sm leading-relaxed", line.color)}
                      >
                        {line.text}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {visibleLines >= terminalLines.length && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="inline-block w-2 h-4 bg-cyan-400 ml-0.5 animate-terminal-blink"
                    />
                  )}
                </div>
              </TerminalWindow>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

