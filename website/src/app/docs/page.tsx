import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Code2,
  FileText,
  KeyRound,
  PackageCheck,
  ShieldCheck,
  Terminal,
  Workflow,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Complete CodeThon CLI documentation covering installation, onboarding, slash commands, provider setup, execution, analysis, profiling, recovery, safety, and publishing workflows.",
  alternates: {
    canonical: "/docs",
  },
};

const commandGroups = [
  {
    title: "Setup",
    commands: [
      ["/onboard", "Run the full first-run provider setup wizard."],
      ["/auth add", "Add and validate provider credentials."],
      ["/auth list", "Show configured providers and active model."],
      ["/auth test [provider]", "Verify provider credentials and reachability."],
      ["/auth switch", "Switch active provider and model."],
      ["/model", "Browse available models and update the active model."],
      ["/doctor", "Run local environment, config, network, auth, and project checks."],
    ],
  },
  {
    title: "Plan And Understand",
    commands: [
      ["/init", "Create or register a project workspace."],
      ["/plan [goal]", "Stream roadmap and architecture generation."],
      ["/roadmap", "Generate project phases, milestones, and priorities."],
      ["/architect", "Design architecture, data flow, and technical choices."],
      ["/analyze [dir]", "Scan project structure and stream an AI summary."],
      ["/explain <file>", "Explain a file's purpose, risks, and architecture role."],
      ["/summarize", "Summarize project health, blockers, and next actions."],
    ],
  },
  {
    title: "Build And Repair",
    commands: [
      ["/execute <goal>", "Run the autonomous agent loop on a concrete task."],
      ["/build [goal]", "Generate and apply code with build-error repair."],
      ["/autofix", "Run build/type checks and apply targeted fixes."],
      ["/debug", "Analyze errors and stream fix guidance."],
      ["/run <cmd>", "Run a shell command through CodeThon policy gates."],
      ["/scaffold [dir]", "Generate a starter project from templates."],
    ],
  },
  {
    title: "Inspect, Recover, Ship",
    commands: [
      ["/profile", "Find performance issues and maintainability risks."],
      ["/review", "Inspect current git changes."],
      ["/diff", "Show the full git diff."],
      ["/checkpoint", "Save, list, and restore recovery points."],
      ["/recover", "Rebuild project context from local files."],
      ["/deploy", "Generate deployment guidance."],
      ["/readme", "Generate or refresh README.md."],
      ["/launch", "Generate demo script, submission copy, and launch assets."],
      ["/startup", "Analyze product and go-to-market potential."],
      ["/learn", "Ask a concept question and get a guided tutorial."],
    ],
  },
];

const providers = [
  ["OpenAI", "OPENAI_API_KEY", "Strong general coding and tool-use workflows."],
  ["Anthropic", "ANTHROPIC_API_KEY", "Long-context reasoning and doc-heavy projects."],
  ["NVIDIA", "NVIDIA_API_KEY", "Free-tier friendly hosted open models."],
  ["Groq", "GROQ_API_KEY", "Fast hosted inference for quick builder loops."],
  ["DeepSeek", "DEEPSEEK_API_KEY", "Reasoning-heavy planning and implementation."],
  ["Together AI", "TOGETHER_API_KEY", "Broad hosted open-model catalog."],
  ["Ollama", "none", "Private local runtime at localhost."],
  ["LM Studio / local server", "none", "OpenAI-compatible local server workflows."],
];

const slashCommands = [
  ["/", "Open slash-command suggestions."],
  ["/p", "Filter matching commands such as /plan and /profile."],
  ["/help", "Show categorized help inside the REPL."],
  ["/init", "Create or register the active project workspace."],
  ["/plan", "Stream roadmap and architecture output."],
  ["/execute <goal>", "Run the autonomous execution agent."],
  ["/analyze", "Show analysis stages and stream the project summary."],
  ["/profile", "Run static performance and maintainability profiling."],
];

const safetyItems = [
  "Use --ask to require approval before writes and command execution.",
  "Use --dry-run to preview writes and commands.",
  "Shell execution is constrained by allowlisted binaries and blocked dangerous patterns.",
  "Child-process environments are filtered for common secret names.",
  "Provider credentials are stored outside project files.",
  "Recovery checkpoints can save, list, and restore project snapshots.",
];

function Section({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="docs-section">
      <p className="docs-kicker">{eyebrow}</p>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-black/82 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="brand-mark">
              <Terminal className="h-4 w-4" />
            </span>
            <span>CodeThon CLI Docs</span>
          </Link>
          <Link href="/" className="icon-link">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </nav>
      </header>

      <section className="hero-oled px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="eyebrow-pill">
            <FileText className="h-3.5 w-3.5" />
            Complete builder documentation
          </p>
          <h1 className="mt-6 max-w-5xl text-balance text-5xl font-semibold leading-[1] tracking-normal sm:text-6xl lg:text-7xl">
            Build with CodeThon CLI from first setup to shipped project.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-white/66">
            This guide covers installation, provider setup, slash-command navigation,
            project initialization, planning, autonomous execution, analysis, profiling,
            recovery, security controls, and release checks.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Install", "npm install -g codethon-cli"],
              ["Start", "ct"],
              ["Initialize", "/init"],
              ["Execute", "/execute <goal>"],
            ].map(([label, value]) => (
              <div key={label} className="docs-stat">
                <span>{label}</span>
                <code>{value}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="mb-3 text-sm font-semibold text-white">On this page</p>
            <div className="grid gap-2 text-sm text-white/58">
              {[
                ["Quick start", "#quick-start"],
                ["Onboarding", "#onboarding"],
                ["Interactive REPL", "#repl"],
                ["Commands", "#commands"],
                ["Providers", "#providers"],
                ["Execution", "#execution"],
                ["Analysis", "#analysis"],
                ["Safety", "#safety"],
                ["Configuration", "#configuration"],
                ["Publishing", "#publishing"],
              ].map(([label, href]) => (
                <a key={href} href={href} className="transition hover:text-white">
                  {label}
                </a>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-8">
          <Section id="quick-start" eyebrow="Quick Start" title="Install and open the builder workspace.">
            <p>
              CodeThon is distributed as the `codethon-cli` npm package. Install it
              globally, then run `ct` from any project directory.
            </p>
            <pre><code>{`npm install -g codethon-cli
ct`}</code></pre>
            <p>
              If no provider is configured, CodeThon opens guided setup before entering
              the interactive workspace. After `ct` opens, use slash commands like
              `/init`, `/plan`, `/execute`, `/analyze`, and `/profile`.
            </p>
          </Section>

          <Section id="onboarding" eyebrow="Onboarding" title="Configure a provider without opening source files.">
            <p>
              First-run setup is designed for global npm users. It does not require
              editing `.env` files or browsing the repository source.
            </p>
            <ul>
              <li>Choose a hosted provider or local model runtime.</li>
              <li>View provider purpose and API-key guidance.</li>
              <li>Enter and validate the credential.</li>
              <li>Select the default model.</li>
              <li>Run a small test request.</li>
              <li>Save the configuration outside the project repo.</li>
            </ul>
          </Section>

          <Section id="repl" eyebrow="Interactive REPL" title="Use slash commands or plain English.">
            <p>
              Running `ct` with no command opens the interactive workspace. Use `/` for
              command discovery and `/p` to narrow to planning/profile commands.
            </p>
            <div className="docs-grid">
              {slashCommands.map(([command, description]) => (
                <div key={command} className="docs-row">
                  <code>{command}</code>
                  <span>{description}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="commands" eyebrow="Commands" title="Everything the CLI can do.">
            <div className="space-y-5">
              {commandGroups.map((group) => (
                <article key={group.title} className="docs-card">
                  <h3>{group.title}</h3>
                  <div className="mt-4 grid gap-3">
                    {group.commands.map(([command, description]) => (
                      <div key={command} className="docs-row">
                        <code>{command}</code>
                        <span>{description}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </Section>

          <Section id="providers" eyebrow="Providers" title="Use hosted APIs or local models.">
            <div className="docs-table">
              {providers.map(([name, key, notes]) => (
                <div key={name} className="docs-table-row">
                  <strong>{name}</strong>
                  <code>{key}</code>
                  <span>{notes}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="execution" eyebrow="Execution Loop" title="Give the agent a concrete task.">
            <p>
              `/execute` runs an autonomous loop with planning, file reading, file
              editing, search, grep/list, web/crawl support, command execution, and
              repair cycles. Good goals are specific and bounded.
            </p>
            <pre><code>{`/execute implement the pricing page and add tests
/debug
/autofix`}</code></pre>
          </Section>

          <Section id="analysis" eyebrow="Analysis And Profiling" title="Understand what the agent sees.">
            <p>
              `/analyze` shows the stages it is running and streams a formatted AI
              summary. `/profile` scans source files for complexity, deep nesting,
              long functions, memory leaks, N+1 patterns, and bundle-size risks.
            </p>
            <pre><code>{`/analyze
/profile
/summarize`}</code></pre>
          </Section>

          <Section id="safety" eyebrow="Safety" title="Keep agentic workflows controlled.">
            <div className="grid gap-3">
              {safetyItems.map((item) => (
                <div key={item} className="check-row">
                  <ShieldCheck className="h-4 w-4 text-[#74d7ff]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="configuration" eyebrow="Configuration" title="Know where state lives.">
            <p>
              CodeThon stores CLI state outside the project source. Project recovery
              snapshots are local to the project when needed.
            </p>
            <div className="docs-grid">
              <div className="docs-row"><code>~/.codethon</code><span>Global CLI config and project state.</span></div>
              <div className="docs-row"><code>~/.codethon/projects</code><span>Tracked CodeThon project metadata.</span></div>
              <div className="docs-row"><code>.codethon/recovery</code><span>Project-local recovery snapshots.</span></div>
              <div className="docs-row"><code>OS keychain</code><span>Credential storage when available, with fallback handling.</span></div>
            </div>
          </Section>

          <Section id="publishing" eyebrow="Publishing" title="Release checks before npm publish.">
            <p>
              Before publishing a major version, run the same checks used for this
              release path.
            </p>
            <pre><code>{`npm run typecheck
npm test
npm run build
cd apps/cli && npm pack --dry-run
npm publish --access public`}</code></pre>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [PackageCheck, "Package has a valid global binary."],
                [Check, "Clean-home setup path is verified."],
                [Workflow, "Slash-command discovery is working."],
                [Code2, "Built bundle is smoke-tested."],
              ].map(([Icon, text]) => {
                const IconComponent = Icon as typeof Check;
                return (
                  <div key={text as string} className="check-row">
                    <IconComponent className="h-4 w-4 text-[#dfff72]" />
                    <span>{text as string}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}
