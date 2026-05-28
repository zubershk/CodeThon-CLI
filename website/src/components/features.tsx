"use client";

import { motion } from "framer-motion";
import {
  Play,
  MessageSquare,
  Users,
  Wrench,
  Activity,
  RotateCcw,
  Network,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LogLine {
  prefix?: string;
  text: string;
  color: string;
}

interface FeatureCard {
  icon: React.ElementType;
  command: string;
  title: string;
  description: string;
  accent: string;
  badge?: string;
  logs: LogLine[];
}

const features: FeatureCard[] = [
  {
    icon: Play,
    command: "$ ct execute \"build dashboard\"",
    title: "Autonomous Execution Loop",
    description:
      "Plan, build, debug, and deploy without lifting a finger.",
    accent: "from-cyan-500 to-cyan-400",
    badge: "Autonomous",
    logs: [
      { prefix: "▶", text: " Analyzing requirements...", color: "text-yellow-400" },
      { prefix: "✓", text: " Planning complete", color: "text-green-400" },
      { prefix: "▸", text: " Writing implementation...", color: "text-cyan-400" },
      { prefix: "✓", text: " Build successful", color: "text-green-400" },
      { prefix: "▸", text: " Deploying...", color: "text-cyan-400" },
      { prefix: "✓", text: " Done (12.4s)", color: "text-green-400" },
    ],
  },
  {
    icon: MessageSquare,
    command: "/chat",
    title: "Persistent REPL",
    description:
      "Interactive shell that remembers context across sessions.",
    accent: "from-purple-500 to-purple-400",
    badge: "Conversational",
    logs: [
      { prefix: "⟩", text: " optimize Dockerfile", color: "text-white/80" },
      { prefix: "", text: "", color: "" },
      { prefix: "▸", text: " Analyzing multi-stage builds...", color: "text-cyan-400" },
      { prefix: "✓", text: " Reduced layers 12 → 5", color: "text-green-400" },
      { prefix: "✓", text: " Base image slimmed 1.2GB → 340MB", color: "text-green-400" },
    ],
  },
  {
    icon: Users,
    command: "$ ct run --agents",
    title: "Multi-Agent System",
    description:
      "Specialized agents collaborate autonomously on your codebase.",
    accent: "from-yellow-500 to-orange-400",
    badge: "Collaborative",
    logs: [
      { prefix: "[Architect]", text: " ● Designing solution", color: "text-purple-400" },
      { prefix: "[Debug]", text: "    ● Analyzing errors", color: "text-red-400" },
      { prefix: "[PM]", text: "       ● Tracking progress", color: "text-cyan-400" },
      { prefix: "[DevOps]", text: "   ● Provisioning infra", color: "text-green-400" },
    ],
  },
  {
    icon: Wrench,
    command: "$ ct build",
    title: "Self-Healing Builds",
    description:
      "Detects failures and auto-fixes without human intervention.",
    accent: "from-red-500 to-red-400",
    badge: "Resilient",
    logs: [
      { prefix: "✕", text: " build failed — missing import", color: "text-red-400" },
      { prefix: "→", text: " auto-fixing...", color: "text-yellow-400" },
      { prefix: "→", text: " installed missing dep", color: "text-yellow-400" },
      { prefix: "✓", text: " build passed (2 retries)", color: "text-green-400" },
    ],
  },
  {
    icon: Activity,
    command: "$ ct feed",
    title: "Live Agent Feed",
    description:
      "Watch every decision and action stream in real-time.",
    accent: "from-emerald-500 to-emerald-400",
    badge: "Real-time",
    logs: [
      { prefix: "10:32:01", text: " ▶ Analyzing codebase", color: "text-cyan-400" },
      { prefix: "10:32:03", text: " ▶ Generating tests", color: "text-cyan-400" },
      { prefix: "10:32:05", text: " ✓ Tests passed", color: "text-green-400" },
      { prefix: "10:32:07", text: " ▶ Deploying to staging", color: "text-cyan-400" },
    ],
  },
  {
    icon: RotateCcw,
    command: "$ ct recover",
    title: "Recovery System",
    description:
      "Time-travel restore points so you never lose progress.",
    accent: "from-cyan-500 to-blue-500",
    badge: "Safe",
    logs: [
      { prefix: "⟳", text: " Restore point saved", color: "text-cyan-400" },
      { prefix: "⟳", text: " Auto-snapshot @ v1.2", color: "text-cyan-400" },
      { prefix: "✓", text: " Recovery ready (3 snapshots)", color: "text-green-400" },
    ],
  },
  {
    icon: Network,
    command: "$ ct config",
    title: "Multi-LLM Router",
    description:
      "Auto-detects and routes to the best model with fallback chain.",
    accent: "from-violet-500 to-purple-500",
    badge: "Smart",
    logs: [
      { prefix: "●", text: " OpenAI", color: "text-green-400" },
      { prefix: "○", text: " Anthropic", color: "text-white/50" },
      { prefix: "○", text: " Groq", color: "text-white/50" },
      { prefix: "○", text: " NVIDIA", color: "text-white/50" },
      { prefix: "○", text: " DeepSeek", color: "text-white/50" },
      { prefix: "○", text: " Ollama", color: "text-white/50" },
    ],
  },
  {
    icon: Shield,
    command: "$ ct run --secure",
    title: "Security Sandbox",
    description:
      "Allowlisted binaries and blocked patterns prevent disaster.",
    accent: "from-sky-500 to-sky-400",
    badge: "Protected",
    logs: [
      { prefix: "✓", text: " Allowed:  ls, git, node", color: "text-green-400" },
      { prefix: "✕", text: " Blocked:  rm -rf, sudo", color: "text-red-400" },
      { prefix: "✓", text: " Allowed:  npm, python", color: "text-green-400" },
      { prefix: "✓", text: " Sandbox active — 28 rules", color: "text-cyan-400" },
    ],
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function Features() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Subtle grid background */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            <span className="text-gradient">
              Everything You Need to Ship at AI Speed
            </span>
          </h2>
          <p className="text-[#8888a0] text-lg max-w-2xl mx-auto">
            A unified terminal experience that replaces the chaotic
            copy-paste workflow with a single autonomous loop.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className={cn(
                  "group relative rounded-xl overflow-hidden",
                  "bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]",
                  "hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-500",
                  "hover:shadow-[0_0_40px_rgba(6,182,212,0.12)]",
                  "flex flex-col"
                )}
              >
                {/* Accent bar */}
                <div
                  className={cn(
                    "h-1 w-full bg-gradient-to-r shrink-0",
                    feature.accent,
                    "opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                  )}
                />

                <div className="p-5 flex flex-col gap-3 flex-1">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <span className="text-xs font-mono text-cyan-400/70">
                          {feature.command}
                        </span>
                        <h3 className="text-sm font-semibold text-white leading-tight">
                          {feature.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#8888a0] leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Terminal output preview */}
                  <div className="mt-auto pt-3 border-t border-white/[0.06]">
                    <div className="rounded-lg bg-[#0a0a0f] p-3 font-mono text-[11px] leading-relaxed space-y-[2px] min-h-[108px]">
                      {feature.logs.map((log, j) => (
                        <div key={j} className="flex items-baseline gap-1.5">
                          {log.prefix && (
                            <span
                              className="text-white/40 shrink-0"
                              style={{ width: `${Math.max(log.prefix.length, 1) * 0.65}em` }}
                            >
                              {log.prefix}
                            </span>
                          )}
                          <span className={cn(log.color || "text-gray-500")}>
                            {log.prefix === "" ? "\u00A0" : log.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

