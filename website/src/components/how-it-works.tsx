"use client";

import { motion } from "framer-motion";
import {
  Lightbulb,
  ClipboardList,
  Code,
  Bug,
  Rocket,
  ChevronRight,
  ChevronDown,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    icon: Lightbulb,
    title: "Idea",
    description:
      "Describe what you want to build in natural language",
  },
  {
    icon: ClipboardList,
    title: "Plan",
    description:
      "AI agents analyze, research, and create an execution strategy",
  },
  {
    icon: Code,
    title: "Build",
    description:
      "Files are written, commands run, and features are built autonomously",
  },
  {
    icon: Bug,
    title: "Debug",
    description:
      "Errors are detected and fixed automatically in real-time",
  },
  {
    icon: Rocket,
    title: "Deploy",
    description:
      "Tests pass, build succeeds, project is ready to ship",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const Icon = step.icon;
  return (
    <motion.div
      variants={itemVariants}
      viewport={{ once: true, margin: "-50px" }}
      className="group relative"
    >
      <div
        className={cn(
          "relative w-[260px] rounded-xl bg-white/[0.03] backdrop-blur-xl",
          "border border-white/[0.06] p-6",
          "transition-all duration-500",
          "hover:bg-white/[0.06] hover:border-white/[0.1]",
          "group-hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
        )}
      >
        <div className="relative w-14 h-14 mb-4">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20" />
          <div className="absolute inset-[1px] rounded-full bg-[#0a0a0f] flex items-center justify-center">
            <Icon className="w-6 h-6 text-cyan-400" />
          </div>
        </div>

        <span className="text-xs font-mono text-cyan-500/60 mb-2 block">
          {String(index + 1).padStart(2, "0")}
        </span>

        <h3 className="text-lg font-semibold text-white mb-2">
          {step.title}
        </h3>

        <p className="text-sm text-[#8888a0] leading-relaxed">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

function Connector() {
  return (
    <>
      <div className="flex md:hidden flex-col items-center py-3">
        <div className="w-0.5 h-10 bg-gradient-to-b from-cyan-500 to-purple-500 rounded-full" />
        <ChevronDown className="w-4 h-4 text-purple-400 -mt-0.5" />
      </div>
      <div className="hidden md:flex items-center px-2">
        <div className="h-0.5 w-12 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" />
        <ChevronRight className="w-4 h-4 text-purple-400 -ml-0.5" />
      </div>
    </>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge variant="cyan" className="mb-4">
            How It Works
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            From Idea to Launch,{" "}
            <span className="text-gradient">Automatically</span>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col md:flex-row items-center justify-center"
        >
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex flex-col md:flex-row items-center"
            >
              <StepCard step={step} index={i} />
              {i < steps.length - 1 && <Connector />}
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-20"
        >
          <div className="inline-flex items-center gap-4">
            <ArrowDown className="w-6 h-6 text-cyan-400 animate-bounce" />
            <span className="text-xl text-[#a0a0b8] font-medium animate-glow-pulse">
              Then iterate until perfect.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

