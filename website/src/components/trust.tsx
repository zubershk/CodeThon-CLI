"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import {
  FlaskConical,
  Terminal,
  FileCode,
  Cpu,
  RefreshCw,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const stats = [
  { value: 58, suffix: "+", label: "E2E Tests", icon: FlaskConical },
  { value: 28, suffix: "+", label: "Commands", icon: Terminal },
  { value: 60, suffix: "+", label: "Source Files", icon: FileCode },
  { value: 8, suffix: "", label: "LLM Providers", icon: Cpu },
  { value: 20, suffix: "", label: "Agent Iterations", icon: RefreshCw },
  { value: 100, suffix: "%", label: "Terminal-Native", icon: Monitor },
];

function AnimatedCounter({
  target,
  suffix,
  isInView,
}: {
  target: number;
  suffix: string;
  isInView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) {
      setCount(0);
      return;
    }

    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), target);
      setCount(current);
      if (current >= target) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [target, isInView]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

export function Trust() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 overflow-hidden px-4 sm:px-6 lg:px-8"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            animation: "gridFlow 20s linear infinite",
          }}
        />
      </div>

      <motion.div
        className="relative mx-auto max-w-6xl"
        initial={{ opacity: 0, y: 32 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div className="flex justify-center mb-12">
          <Badge variant="purple" className="text-xs tracking-wider uppercase">
            Built during the OpenAI × Outskill AI Builders Hackathon
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: 0.1 * index,
                  ease: "easeOut",
                }}
              >
                <div
                  className={cn(
                    "group relative rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06]",
                    "hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-500",
                    "hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] p-6 sm:p-8 text-center"
                  )}
                >
                  <div className="mx-auto mb-4 w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:border-cyan-500/30 transition-all duration-500">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums mb-1">
                    <AnimatedCounter
                      target={stat.value}
                      suffix={stat.suffix}
                      isInView={isInView}
                    />
                  </div>
                  <div className="text-sm text-[#8888a0]">{stat.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}

