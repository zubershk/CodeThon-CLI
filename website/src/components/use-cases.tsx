"use client";

import { motion } from "framer-motion";
import {
  Trophy,
  Rocket,
  Bug,
  LayoutTemplate,
  RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const useCases = [
  {
    icon: Trophy,
    title: "Hackathon Shipping",
    description:
      "Ship complete projects in hours, not days.",
    command: 'ct execute "build a crypto dashboard"',
  },
  {
    icon: Rocket,
    title: "Startup MVPs",
    description:
      "Go from idea to prototype without context switching.",
    command: 'ct execute "create a SaaS landing page with auth"',
  },
  {
    icon: Bug,
    title: "AI-Assisted Debugging",
    description:
      "Find and fix build errors autonomously.",
    command: "ct autofix",
  },
  {
    icon: LayoutTemplate,
    title: "Full-Stack Scaffolding",
    description:
      "Generate complete project structures instantly.",
    command: "ct scaffold --template nextjs",
  },
  {
    icon: RefreshCw,
    title: "Autonomous Iteration",
    description:
      "Keep building until every requirement is met.",
    command: 'ct plan --feature "add dark mode"',
  },
  {
    icon: Zap,
    title: "Rapid Prototyping",
    description:
      "Test ideas in minutes, not hours.",
    command: 'ct execute "build a chat app with WebSockets"',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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

export function UseCases() {
  return (
    <section id="use-cases" className="relative py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge variant="cyan" className="mb-4">
            Use Cases
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Built for How Developers{" "}
            <span className="text-gradient">Actually Work</span>
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {useCases.map((useCase, i) => {
            const Icon = useCase.icon;
            return (
              <motion.div
                key={i}
                variants={cardVariants}
                className={cn(
                  "group rounded-xl bg-white/[0.03] backdrop-blur-xl",
                  "border border-white/[0.06] p-6",
                  "transition-all duration-500",
                  "hover:bg-white/[0.06] hover:border-white/[0.1]",
                  "hover:shadow-[0_0_30px_rgba(6,182,212,0.12)]",
                  "hover:-translate-y-1"
                )}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {useCase.title}
                  </h3>
                </div>

                <p className="text-sm text-[#8888a0] leading-relaxed mb-4 min-h-[40px]">
                  {useCase.description}
                </p>

                <div className="rounded-lg bg-[#0a0a0f] border border-white/[0.06] px-4 py-3">
                  <code className="text-xs font-mono text-cyan-400">
                    {useCase.command}
                  </code>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

