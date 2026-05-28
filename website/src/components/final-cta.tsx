"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ArrowRight, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText("npm install -g codethon-cli");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
    }
  };

  return (
    <section
      id="final-cta"
      className="relative min-h-[80vh] flex items-center justify-center py-24 overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-backdrop via-[#0e0e1a] to-backdrop" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(6,182,212,0.15) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center text-center max-w-3xl mx-auto"
        >
          <Badge variant="cyan" className="mb-6">
            Ship Now
          </Badge>

          <h2
            className={cn(
              "text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6",
              "bg-clip-text text-transparent",
              "bg-gradient-to-r from-white via-cyan-200 to-purple-300"
            )}
          >
            Stop Managing AI Tools.
            <br />
            Start Shipping.
          </h2>

          <p className="text-lg md:text-xl text-[#a0a0b8] mb-10 max-w-xl">
            Your AI engineering teammate is ready. One command away.
          </p>

          {/* Code snippet */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={cn(
              "relative group w-full max-w-lg mb-10",
              "rounded-xl bg-[#0d0d14] border border-white/[0.08] overflow-hidden",
              "shadow-[0_0_30px_rgba(6,182,212,0.08)]",
              "hover:shadow-[0_0_40px_rgba(6,182,212,0.15)]",
              "transition-shadow duration-500"
            )}
          >
            <div className="flex items-center justify-between px-4 h-9 bg-[#0d0d14] border-b border-white/[0.06] select-none">
              <span className="text-xs text-[#8888a0]">Install</span>
              <button
                onClick={copyToClipboard}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors",
                  copied ? "text-green-400" : "text-[#8888a0] hover:text-white"
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="px-5 py-4 font-mono text-sm leading-relaxed">
              <span className="text-[#8888a0]">$ </span>
              <span className="text-cyan-400">
                npm install -g codethon-cli
              </span>
            </div>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Button
              variant="primary"
              size="lg"
              className={cn(
                "gap-2 text-base px-8 h-14",
                "shadow-[0_0_30px_rgba(6,182,212,0.3)]",
                "hover:shadow-[0_0_50px_rgba(6,182,212,0.5)]"
              )}
            >
              Install CLI
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="gap-2 text-base px-8 h-14"
            >
              <Github className="w-5 h-5" />
              View GitHub
            </Button>
          </motion.div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-12 text-xs text-[#8888a0]/60 max-w-lg leading-relaxed"
          >
            Works with OpenAI, Anthropic, Groq, NVIDIA, DeepSeek, Together AI,
            Ollama, and local models.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

