"use client";

import { motion } from "framer-motion";
import {
  Slash,
  Terminal,
  HeartPulse,
  Binary,
  Undo2,
  Activity,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TerminalWindow } from "@/components/ui/terminal-window";

const features = [
  {
    icon: Slash,
    title: "Slash Commands",
    description:
      "27+ built-in commands with fuzzy search and tab completion",
  },
  {
    icon: Terminal,
    title: "Intelligent REPL",
    description:
      "Persistent context-aware shell with command history and suggestions",
  },
  {
    icon: HeartPulse,
    title: "Health Scoring",
    description:
      "Real-time project health metrics across MVP, deploy, and code quality",
  },
  {
    icon: Binary,
    title: "Structured Outputs",
    description:
      "JSON-formatted results for pipeline integration",
  },
  {
    icon: Undo2,
    title: "Checkpoint Recovery",
    description:
      "Time-travel restore points to roll back any change",
  },
  {
    icon: Activity,
    title: "Live Activity Feed",
    description:
      "See every agent action with timing and results",
  },
];

const replLines = [
  { text: "CodeThon > /status", type: "command" },
  { text: "", type: "empty" },
  { text: "Project: Landing Page", type: "output" },
  { text: "Stack: Next.js, Tailwind, TypeScript", type: "output" },
  { text: 'Health: 92% \u25CF', type: "health" },
  { text: "Model: deepseek-ai/deepseek-v4-flash", type: "output" },
  { text: "", type: "empty" },
  { text: "CodeThon > /git suggest", type: "command" },
  { text: "", type: "empty" },
  { text: "\u25CB Analyzing changes...", type: "output" },
  { text: "\u2713 Suggested: feat(hero): add animated terminal showcase", type: "success" },
  { text: "", type: "empty" },
  { text: "CodeThon > \u258A", type: "prompt" },
];

const lineVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.6 + i * 0.08, duration: 0.3, ease: "easeOut" },
  }),
};

function ReplLine({
  line,
  index,
}: {
  line: (typeof replLines)[0];
  index: number;
}) {
  if (line.type === "empty") {
    return (
      <motion.div
        custom={index}
        variants={lineVariants}
        className="h-4"
      />
    );
  }

  const colorClass =
    line.type === "command" || line.type === "prompt"
      ? "text-cyan-400"
      : line.type === "health"
        ? "text-green-400"
        : line.type === "success"
          ? "text-green-400/80"
          : "text-gray-400";

  return (
    <motion.div
      custom={index}
      variants={lineVariants}
      className={cn("whitespace-nowrap", colorClass)}
    >
      {line.text}
    </motion.div>
  );
}

export function DevExperience() {
  return (
    <section id="dev-experience" className="relative py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge variant="cyan" className="mb-4">
            Developer Experience
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            A Terminal That{" "}
            <span className="text-gradient">Thinks With You</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-2xl font-semibold text-white mb-8">
              Why Developers Love It
            </h3>
            <div className="space-y-6">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                    className="flex gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-medium text-white mb-1">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-[#8888a0] leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <TerminalWindow title="CodeThon REPL" className="w-full">
              <div className="flex flex-col gap-0.5">
                {replLines.map((line, i) => (
                  <ReplLine key={i} line={line} index={i} />
                ))}
              </div>
            </TerminalWindow>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div
            className={cn(
              "inline-flex items-center gap-4",
              "rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]",
              "px-8 py-5"
            )}
          >
            <span className="text-lg text-[#a0a0b8] font-medium">
              Ready to level up your terminal workflow?
            </span>
            <Button variant="primary" size="lg" className="gap-2">
              Start Building
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

