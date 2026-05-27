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

# Generate a roadmap and architecture
ct roadmap
ct architect

# Scaffold a Next.js + Tailwind + Supabase starter
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
- Use **slash commands** — `/help`, `/status`, `/doctor`, `/summarize`, `/review`, `/diff`, `/clear`, `/exit`
- Navigate with **arrow keys** through command history
- Use **tab completion** for slash commands

The REPL shows a **context banner** at the top with your project name, stack, phase, health score, and AI model — so you always know where things stand.

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
| `ct scaffold [dir]` | Generate a full Next.js + Tailwind + Supabase starter with dashboard UI |
| `ct status` | Show project health, model, phase, and configuration |

### AI & Planning

| Command | What it does |
|---|---|
| `ct roadmap` | Generate milestones and build plan |
| `ct architect` | Design architecture + stack recommendations |
| `ct learn` | Mentor mode — ask anything and get a guided tutorial |
| `ct startup` | Analyze startup/business potential |
| `ct deploy` | Generate step-by-step deployment guide (Vercel, Railway, Render, etc.) |
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

The CLI's most powerful mode. Give it a goal and it runs up to 20 iterations:

```
ct execute "build a landing page with Tailwind"
```

Each iteration: **plan → research → execute → verify → fix → loop**.

```
  ────────────────────────────────────────────────
  ▶  Iteration 1
  ────────────────────────────────────────────────
  ○ Read: package.json
  ○ Search: "tailwind setup nextjs"
  ✎ Write: app/page.tsx
  ▸ Run: npm run build
  ────────────────────────────────────────────────
  ▶  Iteration 2
  ────────────────────────────────────────────────
  ✓  Build passed
  ✎ Write: app/globals.css
  ▸ Run: npm run dev
  ...
  ────────────────────────────────────────────────
  ✓  Goal met after 4 iterations
```

Tools available to the agent:
- `read_file` — read any file with line numbers
- `write_file` — write new files, edit existing ones (with backup)
- `search_files` — glob pattern matching
- `grep_search` — regex content search
- `list_directory` — browse project structure
- `run_command` — execute shell commands (allowlisted)
- `web_search` — search the web for docs/examples
- `crawl_url` — fetch and extract full webpage content

### Safety-First Execution

Two-layer security model:

1. **Allowlist** — only known-safe commands run: `npm`, `git`, `node`, `python`, `docker`, `cat`, `ls`, `echo`, etc.
2. **Blocklist** — dangerous patterns are rejected by regex: `rm -rf`, `sudo`, `chmod`, pipe-to-shell, fork bombs, `curl`/`wget`

**`--ask` flag** gates every operation with approval:

```bash
ct --ask execute "reset the database"
```

Shows a risk-calibrated prompt with a colored diff before writing files or running commands.

### Self-Healing Build Pipeline

`ct build` and `ct autofix` run actual build commands (`npm run build`, `npx tsc --noEmit`, `next build`), capture the real error output, parse it (TypeScript, Next.js, ESLint, npm formats all supported), and generate AI-driven fixes that are applied to your files.

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

## Configuration

### AI Models

The CLI supports two providers:

| Provider | API Key Required | Models |
|---|---|---|
| **NVIDIA** (default) | Yes (`NVIDIA_API_KEY`) | DeepSeek V4 Flash, Nemotron Super 49B, Llama 3.1 70B |
| **OpenAI** | Yes (`OPENAI_API_KEY`) | GPT-5.5, GPT-5.4, GPT-5.4 Mini, GPT-5 Mini, GPT-5, GPT-4.1, GPT-4o, GPT-4o Mini, o3, o4 Mini |

Switch models anytime:

```bash
ct model
```

### Environment Variables

Configure via `.env` file in the working directory or system environment:

```env
OPENAI_API_KEY=sk-...
NVIDIA_API_KEY=nvapi-...
CODETHON_NVIDIA_KEY=nvapi-...
```

### Global Flags

| Flag | Description |
|---|---|
| `-d, --debug` | Enable verbose debug output |
| `-o, --output <format>` | Output format: `text` (default) or `json` |
| `-a, --ask` | Require approval before running commands or modifying files |

### Config File

Stored at `~/.codethon/config.json`. Contains LLM config, project history, and preferences.

---

## Architecture

```
src/
├── index.ts                 # CLI entry point, commander setup, NL fallback
├── commands/                # One file per command
│   ├── init.ts              # Interactive project wizard
│   ├── execute.ts           # Autonomous execution loop
│   ├── build.ts             # Build engine command
│   ├── autofix.ts           # Auto-fix command
│   ├── debug.ts             # Debug assistant
│   ├── nl.ts                # Natural language with web search
│   ├── scaffold.ts          # Starter project generator
│   ├── emergency.ts         # Demo-day crisis mode
│   ├── deploy.ts            # Deployment guide
│   └── ...                  # roadmap, architect, launch, etc.
├── cil/                     # Core intelligence layer
│   ├── job-loop.ts          # 20-iteration autonomous agent loop
│   ├── tools.ts             # 8-tool executor (read, write, search, etc.)
│   ├── build-engine.ts      # Three-stage build pipeline
│   ├── state-manager.ts     # Project state CRUD with event history
│   └── health-score.ts      # 6-dimension health calculator
├── agents/                  # Specialized LLM agents
│   ├── base-agent.ts        # Base agent with tool-calling loop
│   ├── project-analyzer.ts  # Directory scanner + tech detector
│   └── ...
├── runtime/                 # Command execution sandbox
│   ├── executor.ts          # Allowlist/blocklist + execSync wrapper
│   └── index.ts             # Runtime exports
├── utils/                   # Utilities
│   ├── web-search.ts        # DuckDuckGo/Bing search + URL crawler
│   ├── render.ts            # Custom markdown ANSI renderer
│   ├── error-parser.ts      # tsc/Next.js/ESLint/npm error parser
│   ├── approval.ts          # --ask flag + diff-based approval
│   └── logger.ts            # Terminal UI components
└── vendor/                  # Vendored dependencies
    ├── llm-client/          # LLM provider (OpenAI, NVIDIA, Mock)
    └── shared-types/        # Shared TypeScript interfaces
```

### Key Design Decisions

- **No Python dependency** — fully self-contained Node.js CLI
- **Zero external AI dependency** — LLM calls use vendored providers, not external API wrappers
- **Tool-calling via text parsing** — `TOOL_CALL: {...}` JSON is parsed from LLM output, works with any provider (no native function-calling API needed)
- **Web search without API keys** — DuckDuckGo HTML scraping via built-in `https` module
- **Dual-layer security** — allowlist + blocklist for command execution
- **All state is local** — `conf` npm package stores config at `~/.codethon/`

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

# Test
npm test         # 49+ tests

# Type check
npm run typecheck

# Lint
npm run lint
```

### Project Structure

```
apps/cli/           # Single CLI package
├── src/            # TypeScript source
├── dist/           # Built output (1 MB CJS bundle)
├── __tests__/      # Test files (5 files, 49+ tests)
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
ct roadmap                                 # Plan milestones
ct architect                               # Design architecture
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

- Interactive REPL mode with slash commands (`/plan`, `/review`, `/diff`, `/goal`)
- `ct test` — run project tests and report results
- Multi-file context window management for large codebases
- Plugin system for custom tools and agents
- Web UI companion for visual project management

---

## License

MIT

---

Built for hackers, by Zuber Shaikh. Ship fast. Break things. Win demo day.