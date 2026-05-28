# CodeThon CLI

**AI-native execution orchestration for developers and hackathon builders — plan, build, debug, and ship from your terminal.**

<p align="center">
  <a href="https://www.npmjs.com/package/codethon-cli"><img src="https://img.shields.io/npm/v/codethon-cli?style=flat&label=npm&color=06b6d4" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/codethon-cli"><img src="https://img.shields.io/npm/dm/codethon-cli?style=flat&color=8888a0" alt="npm downloads"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/codethon-cli?style=flat&color=22c55e" alt="node version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/codethon-cli?style=flat&color=a855f7" alt="license"></a>
</p>

```bash
npm install -g codethon-cli
ct init
```

## Quick Start

```bash
# Interactive wizard — define your idea, stack, AI model
ct init

# Generate a combined roadmap + architecture plan
ct plan --stack nextjs+tailwind --feature "user authentication"

# Scaffold a full Next.js + Tailwind starter
ct scaffold my-app
cd my-app

# Autonomous build — it plans, writes code, runs builds, fixes errors
ct execute "add a signup page with email authentication"
```

## Why CodeThon CLI?

Most AI coding tools are **chatbots** — you describe what you want, copy the code, paste it, run the build, copy errors back, repeat. CodeThon CLI is different.

| Other tools | CodeThon CLI |
|---|---|
| You paste AI output → terminal | CLI **writes files directly** |
| You manually run build → copy errors | CLI **auto-fixes build errors** |
| You approve every single step | CLI **loops autonomously until done** |
| Generic chat interface | **Hackathon-tailored** (24h/48h/72h timelines) |

**CodeThon CLI is an autonomous engineering agent that lives in your terminal.** It reads your codebase, writes files, runs commands, searches the web, and fixes its own mistakes — all in a secure, approval-gated execution loop.

## Features

- **Autonomous Execution Loop** — 20-iteration agent that plans, researches, writes files, runs commands, and auto-fixes build errors. State saved every iteration; resumes on crash.
- **Multi-LLM Router** — 7 providers (OpenAI, Anthropic, Groq, DeepSeek, Together, Ollama, LocalServer) with auto-detect, use-case ranking, and fallback chain. Defaults to free NVIDIA-hosted models.
- **Rich Terminal UI** — agent activity feed, token-by-token streaming with syntax highlighting, context banner, per-tool timing.
- **Interactive REPL** — persistent conversational mode with live command suggestions, multi-line input, and project context banner.
- **Safety-First Execution** — allowlist + blocklist + shell injection protection + `--ask` approval + `--dry-run` preview.
- **Self-Healing Build Pipeline** — auto-fix build errors with targeted `oldString`→`newString` edits (no full-file rewrites).
- **Project Health Scoring** — 6-dimension health tracker with snapshot history.
- **Web Intelligence** — built-in web search and URL crawling, no API keys needed.
- **33 CLI Commands** — init, plan, build, execute, debug, autofix, deploy, launch, scaffold, git, test, profile, and more.

## Commands

### Project Setup
| Command | What it does |
|---|---|
| `ct init` | Interactive wizard: define idea, pick stack + timeline + AI model |
| `ct scaffold [dir]` | Generate full-stack starter with 4 templates |
| `ct status` | Show project health, model, phase, configuration |

### AI & Planning
| Command | What it does |
|---|---|
| `ct plan` | Combined roadmap + architecture (accepts `--stack`, `--feature`) |
| `ct learn` | Mentor mode — ask anything, get a guided tutorial |
| `ct startup` | Analyze startup/business potential |
| `ct deploy` | Deploy to Vercel or get a deployment guide |
| `ct launch` | Generate demo-day assets (pitch, submission, social posts) |

### Code Generation & Build
| Command | What it does |
|---|---|
| `ct execute <goal>` | Full autonomous agent — plans, writes, runs, loops until done |
| `ct build [goal]` | Three-stage builder: analyze → build → auto-fix |
| `ct run <command>` | Run any shell command with live streaming preview |
| `ct model` | Switch AI model interactively |

### Debug & Fix
| Command | What it does |
|---|---|
| `ct debug [error]` | Auto-collect errors → AI analysis → auto-fix |
| `ct autofix` | Scan project, detect build errors, fix autonomously |
| `ct emergency` | Demo-day crisis mode |
| `ct diff` | Full `git diff` with syntax-colored output |
| `ct review` | Quick `git diff --stat` overview |

### Intelligence & Recovery
| Command | What it does |
|---|---|
| `ct doctor` | Full project diagnostics |
| `ct explain <file>` | AI-powered code analysis |
| `ct summarize` | Structured project status summary |
| `ct recover` | Rebuild project context from broken state |

### Advanced Features
| Command | What it does |
|---|---|
| `ct git` | AI commit, PR, code review, branch naming |
| `ct test` | Auto-generate tests, mutation testing, coverage |
| `ct profile` | Performance profiling, code smell analysis |
| `ct checkpoint` | Time-travel restore points, rollback |
| `ct onboard` | Interactive environment setup |

### Utilities
| Command | What it does |
|---|---|
| `ct analyze [dir]` | Deep project scan: structure, issues, missing files |
| `ct -h` | Show help |
| `ct -V` | Show version |

## Multi-LLM Router

| Provider | API Key | Models |
|---|---|---|
| **NVIDIA** (default) | `NVIDIA_API_KEY` | DeepSeek V4 Flash (131K ctx), Nemotron Super 49B |
| **OpenAI** | `OPENAI_API_KEY` | GPT-4o, GPT-4o Mini, o3, o4 Mini |
| **Anthropic** | `ANTHROPIC_API_KEY` | Claude 3.5 Sonnet, Claude 3 Opus |
| **Groq** (free) | `GROQ_API_KEY` | Mixtral 8x7B, Llama 3.3 70B |
| **DeepSeek** | `DEEPSEEK_API_KEY` | DeepSeek Chat, DeepSeek Reasoner |
| **Together** | `TOGETHER_API_KEY` | Llama 3.3 70B, Mixtral 8x22B |
| **Ollama** (local) | None | Any local model |
| **LocalServer** (local) | None | LM Studio, LocalAI |

## Install

```bash
# Global install (recommended)
npm install -g codethon-cli
ct init

# Direct execution
npx codethon-cli init
```

## Development

```bash
git clone https://github.com/zubershk/CodeThon-CLI
cd CodeThon-CLI/apps/cli
npm install
npm run build
npm run test
```

## License

MIT — Built for hackers. Ship fast. Win demo day.
