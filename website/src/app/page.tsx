"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clipboard,
  Code2,
  Github,
  KeyRound,
  PackageCheck,
  Radar,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";

const installCommand = "npm install -g codethon-cli";

const navItems = [
  { label: "Workflow", href: "#workflow" },
  { label: "Providers", href: "#providers" },
  { label: "Terminal", href: "#terminal" },
  { label: "Safety", href: "#safety" },
  { label: "Docs", href: "/docs" },
  { label: "FAQ", href: "#faq" },
];

const proofItems = [
  "For builders",
  "Open source",
  "Provider agnostic",
  "Slash-command REPL",
  "Streaming output",
  "Guarded execution",
];

const terminalLines = [
  { prompt: "$", text: "ct", tone: "command" },
  { prompt: "", text: "CodeThon CLI v1.0.0 - interactive builder workspace", tone: "muted" },
  { prompt: "", text: "AI ready - NVIDIA - deepseek-ai/deepseek-v4-flash", tone: "muted" },
  { prompt: ">", text: "/", tone: "command" },
  { prompt: "", text: "/init               Create or register a project workspace", tone: "strong" },
  { prompt: "", text: "/plan [goal]        Stream roadmap and architecture", tone: "strong" },
  { prompt: "", text: "/execute <goal>     Autonomous execution agent", tone: "strong" },
  { prompt: "", text: "/analyze [dir]      Deep codebase analysis", tone: "strong" },
  { prompt: "", text: "/profile            Performance and code-smell scan", tone: "strong" },
  { prompt: ">", text: "/init", tone: "command" },
  { prompt: "", text: "[ok] Workspace registered. Next: /plan", tone: "success" },
  { prompt: ">", text: "/plan launch an AI hackathon copilot", tone: "command" },
  { prompt: "", text: "[stream] Roadmap: MVP scope, phases, risks, demo path", tone: "active" },
  { prompt: "", text: "[stream] Architecture: app shell, auth, data, agent loop", tone: "active" },
];

const workflow = [
  {
    icon: KeyRound,
    eyebrow: "1. Connect",
    title: "Choose the model stack.",
    body: "Configure hosted or local models, validate access, and keep credentials outside the source tree.",
    command: "/auth add",
  },
  {
    icon: Sparkles,
    eyebrow: "2. Initialize",
    title: "Turn the idea into a workspace.",
    body: "Register the project, capture the stack and builder context, and give the agent a durable place to track work.",
    command: "/init",
  },
  {
    icon: Radar,
    eyebrow: "3. Plan",
    title: "Get the roadmap before the code.",
    body: "Stream a builder-friendly plan with milestones, architecture, data flow, risks, and the fastest path to a demo.",
    command: "/plan",
  },
  {
    icon: Workflow,
    eyebrow: "4. Execute",
    title: "Let the agent work through the task.",
    body: "Read files, apply edits, run guarded commands, repair errors, and keep the user informed while it works.",
    command: "/execute <goal>",
  },
  {
    icon: PackageCheck,
    eyebrow: "5. Verify",
    title: "Analyze, profile, recover, and ship.",
    body: "Use diagnostics, project analysis, profiling, recovery points, README generation, and launch assets before demo time.",
    command: "/doctor",
  },
];

const providers = [
  {
    name: "OpenAI",
    src: "https://www.google.com/s2/favicons?domain=openai.com&sz=256",
    detail: "general coding and tool use",
  },
  {
    name: "Anthropic",
    src: "https://www.google.com/s2/favicons?domain=anthropic.com&sz=256",
    detail: "long-context reasoning",
  },
  {
    name: "NVIDIA",
    src: "https://www.google.com/s2/favicons?domain=nvidia.com&sz=256",
    detail: "free-tier open models",
  },
  {
    name: "Groq",
    src: "https://www.google.com/s2/favicons?domain=groq.com&sz=256",
    detail: "fast hosted inference",
  },
  {
    name: "DeepSeek",
    src: "https://www.google.com/s2/favicons?domain=deepseek.com&sz=256",
    detail: "reasoning-heavy builds",
  },
  {
    name: "Together AI",
    src: "https://www.google.com/s2/favicons?domain=together.ai&sz=256",
    detail: "open-model catalog",
  },
  {
    name: "Ollama",
    src: "https://www.google.com/s2/favicons?domain=ollama.com&sz=256",
    detail: "private local runtime",
  },
  {
    name: "LM Studio",
    src: "https://www.google.com/s2/favicons?domain=lmstudio.ai&sz=256",
    detail: "local OpenAI-compatible server",
  },
];

const safety = [
  "Allowlisted shell tools",
  "Blocked destructive patterns",
  "Filtered child-process environment",
  "Ask and dry-run modes",
  "OS-backed credential storage",
  "Project-local recovery points",
];

const builderWins = [
  "Plan the MVP before coding",
  "Generate architecture with context",
  "Stream readable model output",
  "Analyze existing repositories",
  "Profile risky code paths",
  "Create launch and demo assets",
];

const faq = [
  {
    question: "What is CodeThon CLI?",
    answer:
      "CodeThon CLI is an open-source AI builder agent that runs in the terminal. It helps builders configure a model, initialize a project, plan architecture, execute implementation tasks, analyze code, profile risks, and recover project context.",
  },
  {
    question: "Who is it built for?",
    answer:
      "It is built for hackathon teams, indie builders, startup founders, open-source maintainers, and developers who want an agentic workflow without being locked to one AI provider.",
  },
  {
    question: "Which AI providers does it support?",
    answer:
      "CodeThon supports OpenAI, Anthropic, NVIDIA, Groq, DeepSeek, Together AI, Ollama, and LM Studio or other OpenAI-compatible local servers.",
  },
  {
    question: "How does the terminal workflow start?",
    answer:
      "Install with npm, run ct, connect a provider, run /init, then use /plan and /execute to move from idea to implementation.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CodeThon CLI",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Windows, macOS, Linux",
  softwareVersion: "1.0.0",
  description:
    "Open-source AI builder agent for planning, coding, debugging, profiling, and shipping software from the terminal.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "AI provider onboarding",
    "Slash-command REPL",
    "Autonomous execution loop",
    "Streaming AI output",
    "Codebase analysis",
    "Performance profiling",
    "Recovery checkpoints",
  ],
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

function toneClass(tone: string) {
  if (tone === "command") return "text-[#74d7ff]";
  if (tone === "active") return "text-[#dfff72]";
  if (tone === "success") return "text-[#82f7a6]";
  if (tone === "strong") return "text-white";
  return "text-white/52";
}

function CommandCopy({ inverted = false }: { inverted?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, []);

  return (
    <div className={inverted ? "install-strip install-strip-inverted" : "install-strip"}>
      <code className="min-w-0 flex-1 truncate font-mono text-sm">
        {installCommand}
      </code>
      <button
        type="button"
        onClick={copy}
        className="copy-button"
        aria-label="Copy npm install command"
      >
        {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
      </button>
    </div>
  );
}

function TerminalPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
      className="terminal-frame mx-auto w-full max-w-6xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <p className="font-mono text-xs text-white/42">ct interactive builder workspace</p>
      </div>
      <div className="space-y-2 px-4 py-5 font-mono text-[12px] leading-6 sm:px-6 sm:text-sm">
        {terminalLines.map((line, index) => (
          <motion.div
            key={`${line.text}-${index}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + index * 0.07, duration: 0.35 }}
            className="grid grid-cols-[22px_1fr] gap-3"
          >
            <span className="text-white/30">{line.prompt}</span>
            <span className={`${toneClass(line.tone)} break-words`}>{line.text}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#000000] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/72 backdrop-blur-2xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#" className="flex items-center gap-2 font-semibold">
            <span className="brand-mark">
              <Terminal className="h-4 w-4" />
            </span>
            <span>CodeThon CLI</span>
          </a>
          <div className="hidden items-center gap-7 text-sm text-white/58 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </div>
          <a
            href="https://github.com/zubershk/CodeThon-CLI"
            target="_blank"
            rel="noreferrer"
            className="icon-link"
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </nav>
      </header>

      <section className="hero-oled relative overflow-hidden px-5 pb-16 pt-14 sm:pb-20 sm:pt-20 lg:px-8">
        <div className="scanline" />
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="max-w-5xl"
          >
            <p className="eyebrow-pill">
              <Zap className="h-3.5 w-3.5" />
              AI builder agent for hackathons, startups, and open-source projects
            </p>
            <h1 className="mt-6 max-w-5xl text-balance text-5xl font-semibold leading-[0.98] tracking-normal text-white sm:text-6xl lg:text-8xl">
              CodeThon CLI
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/68 sm:text-xl">
              Plan the product, initialize the workspace, generate the roadmap,
              execute the build, debug the failures, profile the code, and prepare
              the launch from one OLED-dark terminal experience.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <a
              href="https://www.npmjs.com/package/codethon-cli"
              target="_blank"
              rel="noreferrer"
              className="primary-button"
            >
              Install the CLI
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#workflow" className="secondary-button">
              Explore builder workflow
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-8 max-w-xl"
          >
            <CommandCopy inverted />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
            className="mt-10 flex flex-wrap gap-2"
          >
            {proofItems.map((item) => (
              <span key={item} className="proof-chip">
                {item}
              </span>
            ))}
          </motion.div>

          <div className="mt-12">
            <TerminalPreview />
          </div>
        </div>
      </section>

      <section id="workflow" className="section-shell">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div>
              <p className="section-kicker">Workflow</p>
              <h2 className="section-title">From idea to a working agent loop.</h2>
              <p className="section-copy">
                CodeThon is designed for builders who need momentum: connect a model,
                run <code>/init</code> to shape the workspace, use <code>/plan</code>
                to design the path, then give <code>/execute</code> a concrete task.
                Diagnostics, profiling, recovery, and launch support stay in the same terminal.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {workflow.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.42, delay: index * 0.06 }}
                    className={index === workflow.length - 1 ? "feature-card md:col-span-2" : "feature-card"}
                  >
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <span className="card-icon">
                        <Icon className="h-5 w-5" />
                      </span>
                      <code className="command-pill">{item.command}</code>
                    </div>
                    <p className="text-sm font-medium text-[#9eb2ab]">{item.eyebrow}</p>
                    <h3 className="mt-2 text-xl font-semibold leading-7 text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/58">{item.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="providers" className="section-shell section-alt">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="section-kicker">Providers</p>
              <h2 className="section-title">Use the model that fits the build.</h2>
              <p className="section-copy">
                CodeThon keeps builders out of model lock-in. Use hosted frontier APIs,
                free-tier open models, or local runtimes when privacy and offline work matter.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {providers.map((provider, index) => (
                <motion.article
                  key={provider.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.36, delay: index * 0.04 }}
                  className="provider-tile"
                >
                  <img src={provider.src} alt={`${provider.name} logo`} className="provider-logo-img" loading="lazy" referrerPolicy="no-referrer" />
                  <h3>{provider.name}</h3>
                  <p>{provider.detail}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="terminal" className="section-shell">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="section-kicker">Terminal UX</p>
            <h2 className="section-title">Live output that explains what the agent is doing.</h2>
            <p className="section-copy">
              Generation commands stream formatted markdown. Analysis and profiling commands
              print each stage before the result. The goal is simple: builders should never
              wonder whether the CLI froze, hid output, or dumped raw JSON by accident.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {builderWins.map((item) => (
                <div key={item} className="check-row">
                  <Check className="h-4 w-4 text-[#dfff72]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mini-terminal">
            <div className="mb-4 border-b border-white/10 pb-3 text-white/42">
              CodeThon &gt; /analyze
            </div>
            <div className="space-y-2">
              <p className="text-[#74d7ff]">[run] Analysis: CodeThon-CLI</p>
              <p className="text-white/58">Scanning file tree in CodeThon-CLI</p>
              <p className="text-white/58">Reading config and entry files</p>
              <p className="text-white/58">Detecting stack, entry points, and missing files</p>
              <p className="text-white/58">Running static project checks</p>
              <p className="text-[#dfff72]">[stream] AI Summary</p>
              <p className="text-white">
                This project contains a Node.js CLI, provider routing, terminal rendering,
                guarded tool execution, recovery flows, and a Next.js website.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="safety" className="section-shell section-alt">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="section-kicker">Safety</p>
              <h2 className="section-title">Agentic power with visible controls.</h2>
              <p className="section-copy">
                CodeThon can write files and run commands, so safety is a core product
                surface. Builders can use ask mode, dry-run mode, provider tests, doctor
                checks, and project recovery points while the agent works.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {safety.map((item) => (
                <div key={item} className="check-row">
                  <ShieldCheck className="h-4 w-4 text-[#74d7ff]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="section-kicker">Open Source</p>
            <h2 className="section-title">A terminal agent builders can inspect and extend.</h2>
            <p className="section-copy">
              The repository keeps command handlers, provider integrations, terminal UI,
              runtime policy, recovery systems, tests, and website source open. The npm
              package ships a compact bundled CLI for global install.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://github.com/zubershk/CodeThon-CLI"
                target="_blank"
                rel="noreferrer"
                className="primary-button"
              >
                <Github className="h-4 w-4" />
                View source
              </a>
              <a
                href="https://www.npmjs.com/package/codethon-cli"
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
              >
                <Code2 className="h-4 w-4" />
                npm package
              </a>
              <a
                href="/docs"
                className="secondary-button"
              >
                <Terminal className="h-4 w-4" />
                Read docs
              </a>
            </div>
          </div>
          <div className="release-panel">
            <p className="text-sm font-semibold uppercase text-[#dfff72]">Release checks</p>
            <div className="mt-5 grid gap-3">
              {[
                "TypeScript build passes",
                "69 Vitest checks pass",
                "npm pack dry-run passes",
                "Installed ct binary smoke-tested",
                "Clean-home setup path verified",
                "Doctor passes on monorepo layout",
              ].map((item) => (
                <div key={item} className="check-row">
                  <PackageCheck className="h-4 w-4 text-[#82f7a6]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="section-shell section-alt">
        <div className="mx-auto max-w-5xl">
          <p className="section-kicker">FAQ</p>
          <h2 className="section-title">Questions builders ask before using CodeThon CLI.</h2>
          <div className="mt-10 grid gap-4">
            {faq.map((item) => (
              <article key={item.question} className="faq-item">
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="final-section">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="section-kicker">Start Building</p>
            <h2 className="section-title">Install the CLI, run `ct`, then begin with `/init`.</h2>
            <p className="section-copy">
              Use CodeThon as a builder cockpit: plan, execute, debug, profile, recover,
              and prepare your launch without leaving the terminal.
            </p>
          </div>
          <div className="mt-8 max-w-xl">
            <CommandCopy inverted />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-5 py-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-white/48 sm:flex-row sm:items-center sm:justify-between">
          <p>CodeThon CLI v1.0.0 - MIT licensed open-source AI builder agent.</p>
          <div className="flex gap-5">
            <a className="transition hover:text-white" href="https://github.com/zubershk/CodeThon-CLI" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="transition hover:text-white" href="https://www.npmjs.com/package/codethon-cli" target="_blank" rel="noreferrer">
              npm
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
