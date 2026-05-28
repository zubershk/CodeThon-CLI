"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Terminal,
  FileCode,
  FlaskConical,
  Cpu,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { CardGlow } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TECH_STACK = [
  "TypeScript",
  "Node.js",
  "OpenAI",
  "NVIDIA",
  "Anthropic",
  "Groq",
  "DeepSeek",
  "Together AI",
  "Ollama",
  "Next.js",
];

interface StatItem {
  icon: typeof Terminal;
  value: number;
  suffix: string;
  label: string;
  desc: string;
}

const STATS: StatItem[] = [
  {
    icon: Terminal,
    value: 28,
    suffix: "+",
    label: "CLI Commands",
    desc: "From init to deploy",
  },
  {
    icon: FileCode,
    value: 60,
    suffix: "+",
    label: "Source Files",
    desc: "TypeScript throughout",
  },
  {
    icon: FlaskConical,
    value: 58,
    suffix: "+",
    label: "E2E Tests",
    desc: "Full coverage suite",
  },
  {
    icon: Cpu,
    value: 8,
    suffix: "",
    label: "LLM Providers",
    desc: "OpenAI, Anthropic, Groq, ...",
  },
  {
    icon: RefreshCw,
    value: 20,
    suffix: "",
    label: "Max Agent Iterations",
    desc: "Autonomous correction loop",
  },
  {
    icon: Sparkles,
    value: 100,
    suffix: "%",
    label: "Terminal Experience",
    desc: "Native, no wrappers",
  },
];

function AnimatedCounter({
  value,
  suffix = "",
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let start: number | null = null;
    const duration = 2000;

    function tick(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [inView, value]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.floor(display).toString();

  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  );
}

export function Architecture() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[150px]" />
        <div className="w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[150px] translate-x-64" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <h2 className="text-gradient text-3xl md:text-5xl font-bold tracking-tight">
            Built on Serious Engineering
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-white text-xl font-semibold mb-6">
              Tech Stack
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TECH_STACK.map((tech) => (
                <motion.div
                  key={tech}
                  whileHover={{ scale: 1.04 }}
                  className={cn(
                    "inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full",
                    "bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]",
                    "hover:bg-white/[0.06] hover:border-white/[0.1]",
                    "hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]",
                    "transition-all duration-300 cursor-default"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)] shrink-0" />
                  <span className="text-sm text-gray-300 whitespace-nowrap">
                    {tech}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-white text-xl font-semibold mb-6">
              By the Numbers
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <CardGlow key={stat.label} className="p-4 md:p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 p-1.5 rounded-lg bg-white/[0.04] shrink-0">
                        <Icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-2xl md:text-3xl font-bold text-white tabular-nums leading-none">
                          <AnimatedCounter
                            value={stat.value}
                            suffix={stat.suffix}
                          />
                        </div>
                        <div className="text-sm font-medium text-white/80 mt-1.5 leading-tight">
                          {stat.label}
                        </div>
                        <div className="text-xs text-[#8888a0] mt-0.5">
                          {stat.desc}
                        </div>
                      </div>
                    </div>
                  </CardGlow>
                );
              })}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 md:mt-20 text-center"
        >
          <blockquote className="inline-block text-base md:text-lg text-[#8888a0] italic border-l-2 border-cyan-500/30 pl-5 py-1 leading-relaxed">
            This is serious engineering. No wrappers. No shortcuts.
          </blockquote>
        </motion.div>
      </div>
    </section>
  );
}

