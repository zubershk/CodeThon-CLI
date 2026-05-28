"use client";

import { motion } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const chaosItems = [
  {
    id: "chat",
    label: "AI Chat",
    icon: "✦",
    x: 46,
    y: 6,
    rotate: -3,
    bg: "bg-white/10",
    border: "border-white/20",
    text: "text-white",
    sub: "text-white/60",
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: "⟩",
    x: 8,
    y: 30,
    rotate: 4,
    bg: "bg-[#0d0d14]",
    border: "border-white/[0.08]",
    text: "text-cyan-400",
    sub: "text-gray-500",
  },
  {
    id: "docs",
    label: "Docs",
    icon: "</>",
    x: 78,
    y: 28,
    rotate: -5,
    bg: "bg-blue-500/10",
    border: "border-blue-500/25",
    text: "text-blue-300",
    sub: "text-blue-400/60",
  },
  {
    id: "browser",
    label: "Browser",
    icon: "⊙",
    x: 14,
    y: 64,
    rotate: 6,
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    text: "text-purple-300",
    sub: "text-purple-400/60",
  },
  {
    id: "debug",
    label: "Debug Loop",
    icon: "⟳",
    x: 74,
    y: 66,
    rotate: -4,
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    text: "text-red-300",
    sub: "text-red-400/60",
  },
];

const connections: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 4],
];

const floatConfigs = [
  { y: [0, -6, 0], duration: 4, delay: 0 },
  { y: [0, -8, 0], duration: 5, delay: 0.5 },
  { y: [0, -5, 0], duration: 3.5, delay: 1 },
  { y: [0, -7, 0], duration: 4.5, delay: 1.5 },
  { y: [0, -6, 0], duration: 5.5, delay: 0.8 },
];

const painPoints = [
  "Endless copy/paste between AI and terminal",
  "Fragmented execution across 5+ tools",
  "Manual debugging loops with no memory",
  "Context switching kills deep work",
];

const benefits = [
  "Autonomous end-to-end execution",
  "Persistent context across sessions",
  "Self-healing build pipeline",
  "One command from idea to deploy",
];

const pipelineSteps = ["Idea", "Plan", "Build", "Debug", "Deploy", "Done"];

export default function Problem() {
  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      {/* Background gradient split */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.04] via-transparent to-transparent" />
        <div className="absolute right-0 inset-y-0 w-full lg:w-1/2 bg-gradient-to-bl from-cyan-500/[0.04] via-green-500/[0.03] to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* ─── LEFT: THE CHAOS ─── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              <span className="text-gradient">AI Coding Workflows Are Still Broken</span>
            </h2>
            <p className="text-[#8888a0] text-lg mb-10 max-w-md">
              Copy-pasting between AI chats and terminals is not engineering.
            </p>

            {/* Chaos visual */}
            <div className="relative w-full h-[340px] sm:h-[380px] mb-10">
              {/* SVG connecting lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <marker
                    id="chaos-arrow"
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                  >
                    <path d="M0,1 L8,5 L0,9 Z" fill="rgba(255,255,255,0.12)" />
                  </marker>
                </defs>
                {connections.map(([from, to], i) => (
                  <line
                    key={i}
                    x1={chaosItems[from].x}
                    y1={chaosItems[from].y}
                    x2={chaosItems[to].x}
                    y2={chaosItems[to].y}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="0.5"
                    strokeDasharray="1.5 1.5"
                    markerEnd="url(#chaos-arrow)"
                  />
                ))}
              </svg>

              {/* Chaotic boxes */}
              {chaosItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  className={cn(
                    "absolute px-3 py-2 rounded-lg border text-xs font-mono",
                    "shadow-lg backdrop-blur-sm select-none",
                    "flex items-center gap-2 min-w-[90px]",
                    item.bg,
                    item.border
                  )}
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: `translate(-50%, -50%) rotate(${item.rotate}deg)`,
                  }}
                  animate={{ y: floatConfigs[i].y }}
                  transition={{
                    duration: floatConfigs[i].duration,
                    delay: floatConfigs[i].delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <span className={item.text}>{item.icon}</span>
                  <span className={item.text}>{item.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Pain points */}
            <ul className="space-y-3">
              {painPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-[#a0a0b8]">
                  <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* ─── RIGHT: THE SOLUTION ─── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-cyan-400 to-cyan-300">
                One Autonomous Execution Loop
              </span>
            </h2>
            <p className="text-[#8888a0] text-lg mb-10 max-w-md">
              Replaces 5 tools with one command.
            </p>

            {/* Pipeline visual */}
            <div className="relative mb-10 pt-4 pb-6">
              {/* Connecting line */}
              <div className="absolute top-[38px] left-[10px] right-[10px] h-[2px] bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-cyan-500/40" />

              <div className="flex items-center justify-between gap-1">
                {pipelineSteps.map((step, i) => {
                  const isLast = i === pipelineSteps.length - 1;
                  return (
                    <div key={step} className="flex items-center gap-1">
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={cn(
                            "relative z-10 flex items-center justify-center rounded-full text-xs font-semibold",
                            "border transition-all duration-300",
                            "w-9 h-9 sm:w-11 sm:h-11",
                            isLast
                              ? "bg-green-500/20 border-green-500/40 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                              : "bg-white/[0.05] border-white/[0.12] text-white/80 hover:border-cyan-400/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                          )}
                        >
                          {isLast ? <Check className="w-4 h-4" /> : step[0]}
                        </div>
                        <span
                          className={cn(
                            "text-[10px] sm:text-xs font-medium whitespace-nowrap",
                            isLast ? "text-green-400" : "text-[#8888a0]"
                          )}
                        >
                          {step}
                        </span>
                      </div>
                      {!isLast && (
                        <ArrowRight className="w-3 h-3 text-white/20 shrink-0 -mb-6" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Benefits */}
            <ul className="space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm text-[#a0a0b8]">
                  <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

