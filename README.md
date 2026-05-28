# CodeThon CLI

**AI-native execution orchestration for hackathons — ship products in record time.**

```bash
npx codethon-cli init
```

---

## Why CodeThon CLI?

Most AI coding tools are **chatbots**, you describe what you want, copy the code, paste it, run the build, copy errors back, repeat. CodeThon CLI is different.

| Other tools | CodeThon CLI |
|---|---|
| You paste AI output → terminal | CLI **writes files directly** |
| You manually run build → copy errors | CLI **auto-fixes build errors** |
| You switch tabs to search docs | CLI **searches the web for you** |
| You approve every single step | CLI **loops autonomously until done** |
| Generic chat interface | **Hackathon-tailored** (24h/48h/72h timelines) |

**CodeThon CLI is an autonomous engineering agent that lives in your terminal.** It reads your codebase, writes files, runs commands, searches the web, and fixes its own mistakes — all in a secure, approval-gated execution loop.

---

## Quick Start

### Install

```bash
npx codethon-cli init
```

Or install globally:

```bash
npm install -g codethon-cli
ct init
```

### First project

```bash
# Interactive wizard — defines your idea, stack, AI model
ct init

# Generate a combined roadmap + architecture plan
ct plan --stack nextjs+tailwind --feature "user authentication"

# Or scaffold a Next.js + Tailwind + Supabase starter
ct scaffold my-app
cd my-app

# Build something
ct execute "add a signup page with email authentication"
```

---

## Live Agent Activity Feed

Long-running operations show **live agent status** instead of boring spinners:

```
[Architect Agent] Analyzing project structure...
[Build Agent] Generating build plan for: landing page with auth
[Debug Agent] Auto-fixing 3 issues...
[Build Agent] ✔ 5 files written, 2 commands executed
```

Each agent has its own color:
- `[PM Agent]` → green — planning
- `[Architect Agent]` → magenta — architecture
- `[Build Agent]` → cyan — building
- `[Debug Agent]` → yellow — debugging
- `[Deploy Agent]` → blue — deployment
- `[Research Agent]` → white — web search

---

## Interactive REPL Mode

Running `ct` with no arguments launches a **persistent execution-aware REPL**:

```
CodeThon >
```

Inside the REPL, you can:

- Type any **natural language question** — automatically searches the web and crawls URLs
- Use **slash commands** — `/help` (categorized), `/plan`, `/status`, `/doctor`, `/summarize`, `/review`, `/diff`, `/run`, `/clear`, `/exit`, plus all 27 CLI commands
- **Live suggestion dropdown** — type `/` followed by partial letters to see a fuzzy-matched inline box of up to 10 matching commands. Navigate with **up/down arrows**, Tab to cycle, Enter to select
- Navigate with **arrow keys** through command history (200-entry ring buffer) when no suggestions are active
- **Multi-line input** — Shift+Enter for newline, Enter to submit

The REPL shows a **context banner** at the top with your project name, stack, phase, health score, and AI model — so you always know where things stand. The REPL uses a raw-mode keypress handler for precise cursor control and ANSI escape sequences for stable in-place rendering.

```
  ────────────────────────────────────────────────────────
  Project: AI SaaS  ┃  Stack: Next.js + Supabase  ┃  Phase: Building  ┃  Health: 82%  ┃  Model: gpt-4o
  ────────────────────────────────────────────────────────

CodeThon > fix the login page
```

This turns the CLI into a **persistent, conversational execution teammate** — not a one-shot command runner.

---

## Commands

### Project Setup

| Command | What it does |
|---|---|
| `ct init` | Interactive wizard: define idea, pick stack + timeline + AI model |
| `ct scaffold [dir]` | Generate a full Next.js + Tailwind + Supabase starter with dashboard UI. Use `-t, --template <name>` for non-interactive mode |
| `ct status` | Show project health, model, phase, and configuration |

### AI & Planning

| Command | What it does |
|---|---|
| `ct plan` | **Combined roadmap + architecture** — accepts `--stack` and `--feature` flags. Runs PM + Architect agents in sequence |
| `ct roadmap` | Generate milestones and build plan |
| `ct architect` | Design architecture + stack recommendations |
| `ct learn` | Mentor mode — ask anything and get a guided tutorial |
| `ct startup` | Analyze startup/business potential |
| `ct deploy` | Deploy to Vercel or get a deployment guide |
| `ct launch` | Generate demo-day assets (pitch, submission, social posts) |
| `ct readme` | Auto-generate README.md and write it to disk |

### Code Generation & Build

| Command | What it does |
|---|---|
| `ct build [goal]` | Three-stage autonomous builder: analyze → build → auto-fix |
| `ct execute <goal>` | **Full autonomous agent** — plans, reads, writes, runs, searches, loops until done |
| `ct run <command>` | Run any shell command with live streaming terminal preview |
| `ct model` | Switch AI model interactively (OpenAI or free NVIDIA) |

### Debug & Fix

| Command | What it does |
|---|---|
| `ct debug [error]` | Auto-collect build errors → parse → suggest fixes → AI analysis → auto-fix |
| `ct autofix` | Scan project, detect build errors, fix them autonomously |
| `ct emergency` | Demo-day crisis mode: describe the crash, get recovery steps |
| `ct diff` | Full `git diff` with syntax-colored output |
| `ct review` | Quick `git diff --stat` overview of changed files |

### Intelligence & Recovery

| Command | What it does |
|---|---|
| `ct doctor` | Run full project diagnostics — checks Node version, package.json, dependencies, env vars, config files, TypeScript errors |
| `ct explain <file>` | AI-powered code analysis — explains purpose, architecture role, risks, and optimization ideas for any file |
| `ct summarize` | Generate structured project status with blockers, next priorities, readiness score, and recommended next command |
| `ct recover` | Scan repository, rebuild project context, detect broken state, reconstruct roadmap and execution awareness |

All four use the **Agent Activity Feed** with dedicated agents:
```
[Doctor Agent] Running project diagnostics...
[Architect Agent] Analyzing src/api/auth.ts...
[PM Agent] Generating project summary...
```

### Phase 4: Auto-Saved Outputs

Every major command auto-saves structured reports to `.codethon/`:

```
.codethon/
├── planning/
│   ├── roadmap-2026-05-27.md
│   └── architecture-2026-05-27.md
├── debug-reports/
│   └── debug-2026-05-27.md
├── launch-assets/
│   └── launch-2026-05-27.md
├── sessions/
│   └── session-2026-05-27.md
└── reports/
    ├── health-2026-05-27.md
    └── recovery-2026-05-27.md
```

Run `ct status` to see a summary of all saved outputs.

---

### Natural Language

| Command | What it does |
|---|---|
| `ct <any question>` | Free-form query with live web search + URL crawling — no `?` needed |

Example:
```bash
ct what is credensa.in
ct how do I set up Supabase auth in Next.js
ct explain this project to me
```

### Utilities

| Command | What it does |
|---|---|
| `ct analyze [dir]` | Deep project scan: structure, tech stack, issues, missing files |
| `ct clear` | Clear the terminal |
| `ct -h` | Show help |
| `ct -V` | Show version |

---

## Features

### Autonomous Execution Loop (`ct execute`)

The CLI's most powerful mode. Give it a goal and it runs up to 20 iterations with **live streaming output** — you watch the AI think, write files, and run commands in real time:

```
ct execute "build a landing page with Tailwind"
```

Each iteration: **plan → research → execute → verify → fix → loop**.

```
  ────────────────────────────────────────────────
  ▶  Iteration 1
  ────────────────────────────────────────────────
  ○ Reading: package.json
  ○ Searching: "tailwind setup nextjs"
  ★ Writing: app/page.tsx
  ▸ Running: npm run build
  ┌─ Output ──────────────────────────────────┐
  │ > build                                    │
  │ ✓ Build passed in 2.3s                    │
  └────────────────────────────────────────────┘
  ── Tool 1/4 completed in 1.2s ──
  ────────────────────────────────────────────────
  ▶  Iteration 2
  ────────────────────────────────────────────────
  ✓  Build passed
  ★ Writing: app/globals.css
  ▸ Running: npm run dev
  ...
  ────────────────────────────────────────────────
  ✓  Goal met after 4 iterations (total: 1m 23s)
```

Key features:
- **Token streaming** — model output appears character-by-character as the LLM generates it
- **Per-tool timing** — each read/write/run shows elapsed time and iteration progress
- **Terminal box** — command output rendered in a box with border characters
- **Checkpoint recovery** — state saved every iteration; resumes on crash with `loadCheckpoint()`
- **Auto-retry** — 2 retries on 502/503/504/timeout errors
- **Context compaction** — automatically compresses long conversations (>20 messages or >8000 chars)

Tools available to the agent:
- `read_file` — read any file with line numbers
- `write_file` — write new files, edit existing ones (with backup, rejects `.env` placeholders)
- `search_files` — glob pattern matching
- `grep_search` — regex content search
- `list_directory` — browse project structure
- `run_command` — execute shell commands (allowlisted, no shell injection)
- `web_search` — search the web for docs/examples
- `crawl_url` — fetch and extract full webpage content

### Safety-First Execution

Three-layer security model:

1. **Allowlist** — only known-safe commands run: `npm`, `git`, `node`, `python`, `docker`, `cat`, `ls`, `echo`, etc.
2. **Blocklist** — dangerous patterns are rejected by regex: `rm -rf`, `sudo`, `chmod`, pipe-to-shell, fork bombs, `curl`/`wget`
3. **Shell injection protection** — all commands use `spawnSync` with `shell: false` (no shell metacharacter injection). 30+ credential patterns filtered from child process env vars.

**`--ask` flag** gates every operation with risk-calibrated approval:

```bash
ct --ask execute "reset the database"
```

**`--dry-run` flag** previews changes without writing:

```bash
ct --dry-run execute "add a landing page"
```

**Prompt injection boundaries** — `<USER_GOAL>`, `<TOOL_RESULT>`, `<TOOL_CONTENT>` markers isolate data from instructions in all system prompts.

### Self-Healing Build Pipeline

`ct build` and `ct autofix` run actual build commands (`npm run build`, `npx tsc --noEmit`, `next build`), capture the real error output, parse it (TypeScript, Next.js, ESLint, npm formats all supported), and generate AI-driven fixes.

Fixes use **targeted `oldString`→`newString` edits** — the LLM receives the original file contents alongside build errors, and outputs only the changed lines. This prevents the common problem of AI tools rewriting entire files and hallucinating unrelated changes.

No "here's a suggestion, fix it yourself" — the CLI **edits the files and re-runs the build**.

### Live Web Intelligence

Two capabilities, zero dependencies:

- **`searchWeb(query)`** — searches DuckDuckGo (primary) and Bing (fallback) via HTML scraping. Returns 10 results with title, URL, snippet. No API key needed.
- **`crawlUrl(url)`** — fetches a URL, extracts title, description, headings, paragraphs, and links. Returns structured content for LLM consumption.

Built entirely with Node.js built-in `https`/`http` modules — **zero npm dependencies for web access**.

### Project Health Scoring

Six-dimensional health score that tracks your project continuously:

| Dimension | Weight | What it measures |
|---|---|---|
| MVP Completion | 25% | Milestones, architecture, build phase, debug sessions |
| Deployment Readiness | 15% | Platform config, env vars, build passing, live URL |
| Documentation | 10% | Roadmap, architecture, README, launch assets |
| Blocker Severity | 20% | Active blockers penalize, resolved blockers reward |
| Launch Readiness | 15% | Live URL, done milestones, launch outputs |
| Velocity | 15% | Actions per sprint hour normalized to 0-100 |

Every state change is timestamped and retains history. You can roll back to any prior snapshot.

### Rich Terminal UI

Custom markdown renderer built with `chalk` — no heavy terminal UI frameworks:

```
┌─ TypeScript ───────────────┐
│ import { useState } from   │
│ 'react';                   │
│                            │
│ export function App() {    │
│   return <div>Hello</div>; │
│ }                          │
└────────────────────────────┘
```

- Syntax-colored diffs
- Animated spinners
- Box-drawn code blocks
- Tree-drawing file structure visualizations
- Styled approval dialogs with risk badges

### Scaffolded Dashboard

The starter project includes a full working dashboard UI:

- **Planning Board** — task list with checkboxes
- **AI Chat** — integrated LLM query panel
- **Launch Checklist** — pre-flight checks for demo day
- **Health Gauges** — animated SVG charts showing project metrics
- **Quick-Action Buttons** — one-click CLI commands

---

### Multi-LLM Router

The CLI includes a **smart multi-provider routing layer** that auto-detects available models and falls back gracefully:

| Provider | API Key | Models |
|---|---|---|
| **NVIDIA** (default) | `NVIDIA_API_KEY` (or `nvapi-*` in `OPENAI_API_KEY`) | DeepSeek V4 Flash (131K ctx), Nemotron Super 49B, Llama 3.1 70B |
| **OpenAI** | `OPENAI_API_KEY` | GPT-4o, GPT-4o Mini, o3, o4 Mini |
| **Anthropic** | `ANTHROPIC_API_KEY` | Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus |
| **Groq** (free) | `GROQ_API_KEY` | Mixtral 8x7B, Llama 3.3 70B, Llama 3.1 8B, Gemma 2 9B |
| **DeepSeek** | `DEEPSEEK_API_KEY` | DeepSeek Chat, DeepSeek Reasoner |
| **Together** | `TOGETHER_API_KEY` | Llama 3.3 70B, Mixtral 8x22B |
| **Ollama** (local) | None | Any locally running model |
| **LocalServer** (local) | None | LM Studio, LocalAI, any OpenAI-compatible server |

Features:
- **Auto-detect** — checks all env vars on startup, pings local servers (Ollama/LM Studio/LocalAI)
- **Use-case ranking** — `rankModelsByUseCase()` reorders by `quick` / `code-generation` / `analysis` / `research` priority maps
- **Fallback chain** — `LLMRouter.callWithFallback()` tries providers in priority order on failure
- **Cost tracking** — `CostTracker` records per-model token costs with $/1M-token pricing
- **LLM cache** — `LLMCache` caches responses by prompt hash (configurable TTL)
- **Token counter** — estimates token counts per provider/model

Switch models anytime:

```bash
ct model
```

### Rich Terminal UI Layer

The CLI uses a custom **double-buffered terminal renderer** instead of raw `chalk`:

- **`TerminalRenderer`** — RGB color engine with dirty-cell diffing, box-drawing utilities, ANSI-safe width calculation
- **`Animations`** — thinking pulse, wave, explosion, shake effects for agent status indicators
- **`AgentVisualizer`** — multi-panel layout showing agent name, status, step count, and streaming output
- **`StreamingRenderer`** — token-by-token output with syntax highlighting (TypeScript, Python, JSX, JSON, YAML)
- **`Theme`** — dark/light mode, gradient generation, ANSI escape helpers for consistent styling
- **`LayoutEngine`** — dynamic terminal layout with header, main, and footer regions
- **`KeyBindingManager`** — configurable key bindings for REPL navigation

### Advanced Features

| Feature | Description |
|---|---|
| **`GitIntegration`** | AI commit messages (`/review`), PR creation, code review summaries, branch naming |
| **`TestAgent`** | Auto-generate tests for 6 frameworks (Jest, Vitest, Mocha, Pytest, Go test, Rust test), run mutation testing, coverage analysis |
| **`ProfilerAgent`** | Detect N+1 queries, unoptimized React re-renders, memory leaks, dead code, bundle size regressions, code smells |
| **`RecoverySystem`** | Time-travel restore points — snapshot project state before destructive operations, rollback on failure |
| **`OnboardingWizard`** | First-time setup flow — API key configuration, model selection, project import |
| **`GracefulShutdown`** | Cleanup handlers for SIGTERM/SIGINT, save checkpoint before exit |

### Environment Variables

Configure via `.env` file — the CLI chain-loads from your project directory up to the root, so API keys in a parent `.env` are always found:

```env
OPENAI_API_KEY=sk-...
NVIDIA_API_KEY=nvapi-...
CODETHON_NVIDIA_KEY=nvapi-...
```

**Note:** The AI agent is prevented from creating `.env` files or writing placeholder keys (`your_api_key_here`). Create your `.env` before running `ct execute`.

### Global Flags

| Flag | Description |
|---|---|
| `-d, --debug` | Enable verbose debug output |
| `-o, --output <format>` | Output format: `text` (default) or `json` |
| `-a, --ask` | Require approval before running commands or modifying files |
| `-n, --dry-run` | Preview changes without writing files or executing commands |

### Scaffold Templates

| Template | Description |
|---|---|
| `nextjs-tailwind` | Next.js + Tailwind CSS + TypeScript (recommended) |
| `react-vite` | React + Vite + TypeScript |
| `express-api` | Express.js REST API + TypeScript |
| `python-fastapi` | Python FastAPI + uvicorn |

Use `-t, --template <name>` to skip interactive selection:

```bash
ct scaffold my-app -t nextjs-tailwind
```

### Config File

Stored at `~/.codethon/config.json`. Contains LLM config, project history, and preferences.

---

## Architecture

```
src/
├── index.ts                 # CLI entry point, commander setup, NL fallback
├── commands/                # One file per command
│   ├── init.ts              # Interactive project wizard
│   ├── plan.ts              # Combined roadmap + architecture (--stack, --feature flags)
│   ├── execute.ts           # Rich live execution UI (thinking animation, per-tool timing)
│   ├── build.ts             # Build engine command
│   ├── autofix.ts           # Auto-fix command
│   ├── debug.ts             # Debug assistant
│   ├── nl.ts                # Natural language with web search
│   ├── scaffold.ts          # Starter project generator (4 templates, --template flag)
│   ├── emergency.ts         # Demo-day crisis mode
│   ├── deploy.ts            # Real Vercel deployment (auto-installs CLI, deploys, captures URL)
│   ├── repl.ts              # Interactive REPL (raw-mode keypress, suggestion box, multi-line)
│   ├── run.ts               # Shell command runner with live streaming terminal preview
│   └── ...                  # roadmap, architect, launch, etc. (27 total)
├── cil/                     # Core intelligence layer
│   ├── job-loop.ts          # 20-iteration autonomous agent loop (streaming, retry, compaction)
│   ├── tools.ts             # 8-tool executor (read, write, search, etc.) + .env guard
│   ├── build-engine.ts      # Three-stage build pipeline (targeted autofix edits)
│   ├── state-manager.ts     # Project state CRUD with event history
│   └── health-score.ts      # 6-dimension health calculator
├── llm/                     # Multi-LLM router
│   ├── providers/           # 7 provider implementations (OpenAI, Anthropic, Groq, DeepSeek, Together, Ollama, LocalServer)
│   ├── llm-router.ts        # Auto-detect + fallback chain + smart model selection
│   ├── auto-detect.ts       # Model catalog, env-var detection, local server pinging
│   ├── cost-tracker.ts      # Per-model token cost tracking
│   ├── llm-cache.ts         # Response cache by prompt hash (configurable TTL)
│   └── token-counter.ts     # Provider-aware token estimation
├── ui/                      # Terminal UI layer
│   ├── TerminalRenderer.ts  # Double-buffered RGB renderer with dirty-cell diffing
│   ├── Animations.ts        # Thinking pulse, wave, explosion, shake effects
│   ├── AgentVisualizer.ts   # Multi-panel agent status display
│   ├── StreamingRenderer.ts # Token-by-token streaming + syntax highlighting (5 languages)
│   ├── LayoutEngine.ts      # Dynamic terminal layout (header/main/footer)
│   ├── KeyBindingManager.ts # Configurable key bindings
│   └── Theme.ts             # Dark/light mode, gradient generation, ANSI helpers
├── features/                # Advanced features
│   ├── GitIntegration.ts    # AI commit, PR creation, code review
│   ├── TestAgent.ts         # Auto-generate tests, mutation testing, coverage
│   ├── ProfilerAgent.ts     # N+1 detection, memory leaks, bundle size, code smells
│   ├── RecoverySystem.ts    # Time-travel restore points, rollback
│   ├── OnboardingWizard.ts  # First-time setup flow
│   └── GracefulShutdown.ts  # SIGTERM/SIGINT cleanup handlers
├── agents/                  # Specialized LLM agents
│   ├── base-agent.ts        # Base agent with tool-calling loop
│   ├── project-analyzer.ts  # Directory scanner + tech detector
│   └── ...
├── runtime/                 # Command execution sandbox
│   ├── executor.ts          # Allowlist/blocklist + spawnSync wrapper
│   └── index.ts             # Runtime exports
├── utils/                   # Utilities
│   ├── web-search.ts        # DuckDuckGo/Bing search + URL crawler
│   ├── render.ts            # Custom markdown ANSI renderer
│   ├── error-parser.ts      # tsc/Next.js/ESLint/npm error parser
│   ├── approval.ts          # --ask flag + diff-based approval
│   ├── help.ts              # Categorized help output (shared by CLI and REPL)
│   ├── env.ts               # sanitizeEnv(), resolveBin(), spawnCommand() (cross-platform)
│   ├── terminal-preview.ts  # Streaming terminal output via spawn + readline
│   ├── splash.ts            # ASCII art splash banner
│   └── logger.ts            # Terminal UI components
├── templates/               # Scaffold templates
│   └── templates.ts         # 4 starter templates (Next.js, React+Vite, Express, FastAPI)
└── vendor/                  # Vendored dependencies (backward-compat wrappers)
    ├── llm-client/          # Re-exports from src/llm/
    └── shared-types/        # Shared TypeScript interfaces
```

### Key Design Decisions

- **No Python dependency** — fully self-contained Node.js CLI
- **Zero external AI dependency** — LLM calls use vendored providers, not external API wrappers
- **Tool-calling via text parsing** — `TOOL_CALL: {...}` JSON is parsed from LLM output, works with any provider (no native function-calling API needed)
- **Multi-LLM routing** — 7 providers with auto-detect, use-case ranking, and fallback chain via `LLMRouter`
- **Rich terminal UI** — double-buffered RGB renderer with animations, agent visualizer, streaming syntax highlighting
- **Web search without API keys** — DuckDuckGo HTML scraping via built-in `https` module
- **Three-layer security** — allowlist + blocklist + shell injection protection (`spawnSync` w/ `shell: false`). 30+ credential patterns filtered from child process env vars
- **Prompt injection boundaries** — `<USER_GOAL>`, `<TOOL_RESULT>`, `<TOOL_CONTENT>` markers in system prompts
- **Checkpoint recovery** — autonomous execution saves state each iteration; resumes on crash
- **Targeted autofix edits** — `autofix` uses `oldString`→`newString` edits instead of full-file rewrites, preserving unrelated code
- **All state is local** — `conf` npm package stores config at `~/.codethon/`
- **Cross-platform Windows support** — `.cmd` wrapper detection with `resolveBin()`, `shell: true` for `.cmd` binaries
- **NVIDIA API auto-detect** — `nvapi-*` keys in `OPENAI_API_KEY` are automatically routed to `integrate.api.nvidia.com/v1`
- **REPL suggestion system** — live fuzzy-matched command dropdown with auto-scroll, navigable via up/down/Tab
- **Brutal E2E test suite** — 58 integration tests exercising CLI bootstrap, all 26 commands, REPL pipe, error paths, and security boundaries

---

## Development

```bash
# Clone and install
git clone https://github.com/zubershk/CodeThon-CLI
cd CodeThon-CLI/apps/cli
npm install

# Build
npm run build    # tsup → dist/index.js

# Run locally
node dist/index.js init

# Development with watch mode
npm run dev

# Test (unit)
npm test         # 64 tests across 7 files (vitest, single-fork)

# E2E test (brutal)
pwsh __tests__/brutal-e2e.ps1        # 58 tests
pwsh __tests__/brutal-e2e.ps1 -Fast  # 36 tests (subset)

# Type check
npm run typecheck

# Lint
npm run lint
```

### Project Structure

```
apps/cli/           # Single CLI package
├── src/            # TypeScript source (60+ files)
│   ├── commands/   # 28 command implementations
│   ├── cil/        # Core intelligence layer (agent loop, tools, build engine)
│   ├── llm/        # Multi-LLM router (7 providers, auto-detect, fallback)
│   ├── ui/         # Terminal UI layer (renderer, animations, theme)
│   ├── features/   # Advanced features (git, test, profiler, recovery)
│   ├── agents/     # 10 specialized LLM agents
│   ├── runtime/    # Command sandbox (allowlist/blocklist)
│   ├── utils/      # Utilities (web search, env, help, logger)
│   ├── templates/  # 4 scaffold templates
│   └── vendor/     # Backward-compat wrappers
├── dist/           # Built output (356 KB CJS bundle)
├── __tests__/      # Unit tests (7 files, 64 tests) + E2E (58 tests)
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

---

## Use Cases

### Hackathon: Build a full-stack app in 24 hours

```bash
ct init                                    # "Idea: A todo app with auth"
ct plan --feature "task management"        # Combined roadmap + architecture
ct scaffold my-hackathon                   # Generate starter code
cd my-hackathon
ct execute "add a PostgreSQL database with Prisma schema for tasks"
ct execute "add user authentication with Supabase"
ct execute "build the todo CRUD API"
ct build                                   # Fix any build errors
ct launch                                  # Generate demo-day pitch
ct readme                                  # Auto-generate README
```

### Debug a broken build

```bash
ct debug                      # Auto-detects errors, suggests fixes, applies them
# or
ct autofix                    # Scans + fixes autonomously
```

### Learn something new

```bash
ct learn                      # "How do I use Next.js API routes?"
ct learn                      # "Explain React Server Components"
```

### Research + Build

```bash
ct "find the latest Supabase auth documentation"
ct execute "research how to implement Stripe checkout in Next.js, then build it"
```

---

## Roadmap

- Performance benchmarks and regression testing
- Documentation site and video tutorials

---

## License

MIT

---

Built for hackers, by Zuber Shaikh. Ship fast. Break things. Win demo day.