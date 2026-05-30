# CodeThon CLI

Provider-agnostic AI coding agent for the terminal. CodeThon helps you configure a model, understand a repo, plan the work, execute concrete tasks, recover from failures, and ship from one CLI.

```bash
npm install -g codethon-cli
ct
```

Current package: `codethon-cli@1.0.0`

## What It Is

CodeThon CLI is an open-source terminal workspace for AI-assisted software delivery. It is built for developers, hackathon teams, and maintainers who want a local-first workflow instead of a browser-only coding chat.

It can:

- onboard a provider from the terminal
- store provider configuration outside the project repo
- show slash-command suggestions in the REPL
- stream formatted AI output while generation is happening
- analyze codebases and explain what it is checking
- profile code for maintainability and performance risks
- run an autonomous execution loop with guarded tools
- recover context from local project files
- generate launch, README, deployment, and startup material

## Install

```bash
npm install -g codethon-cli
ct
```

Requirements:

- Node.js 18 or newer
- Git for repository-aware workflows
- one hosted provider API key or a local model server

## First Run

Run `ct`.

If no working provider is configured, CodeThon starts guided setup:

1. Choose a provider.
2. Read provider details and API-key link.
3. Enter the API key if needed.
4. Validate the key.
5. Pick a model.
6. Run a test request.
7. Save configuration and show next actions.

Supported providers:

| Provider | Credential | Notes |
|---|---|---|
| NVIDIA | `NVIDIA_API_KEY` | Free-tier friendly hosted open models |
| OpenAI | `OPENAI_API_KEY` | Strong general coding and tool use |
| Anthropic | `ANTHROPIC_API_KEY` | Long-context reasoning workflows |
| Groq | `GROQ_API_KEY` | Fast hosted inference |
| DeepSeek | `DEEPSEEK_API_KEY` | Reasoning-heavy workflows |
| Together AI | `TOGETHER_API_KEY` | Broad hosted open-model catalog |
| Ollama | none | Local runtime at `localhost:11434` |
| LM Studio / local server | none | OpenAI-compatible local server |

## Interactive Mode

Running `ct` with no command opens the interactive REPL:

```text
CodeThon >
```

Use `ct` once to open the workspace, then use slash commands inside CodeThon.
Standalone commands such as `ct doctor` still work for scripts, but the primary
builder experience is `/init`, `/plan`, `/execute`, `/analyze`, and `/profile`.

Useful input:

| Input | Result |
|---|---|
| `/` | Open the slash-command palette |
| `/p` | Filter commands such as `/plan` and `/profile` |
| `/help` | Show categorized command help |
| `/status` | Show current project, provider, model, and next actions |
| plain English | Ask the configured AI provider |

Example:

```text
CodeThon > /
  /execute <goal>    Autonomous execution agent
  /explain <file>    Explain a file
  /checkpoint        Recovery points
  /architect         Design architecture
  /summarize         Generate project summary
  /analyze [dir]     Deep codebase analysis
```

## Common Workflow

```text
/auth add
/init
/plan build a Next.js dashboard with Supabase auth
/execute implement the dashboard shell and auth flow
/profile
/doctor
/review
```

## Core Commands

### Setup

| Command | Purpose |
|---|---|
| `/onboard` | Run guided first-run setup again |
| `/auth add` | Add and validate a provider credential |
| `/auth list` | Show configured providers and active model |
| `/auth test [provider]` | Test provider authentication |
| `/auth switch` | Switch provider and model |
| `/auth remove [provider]` | Remove a provider credential |
| `/auth logout` | Remove credentials and reset auth state |
| `/model` | Browse and switch models |
| `/doctor` | Diagnose Node, Git, config, auth, network, and project health |

### Plan And Understand

| Command | Purpose |
|---|---|
| `/init` | Create or register a project workspace |
| `/plan [goal]` | Stream roadmap and architecture generation |
| `/roadmap` | Generate phases and milestones |
| `/architect` | Generate architecture, data flow, and stack guidance |
| `/analyze [dir]` | Scan project structure and stream an AI summary |
| `/explain <file>` | Explain a file and its risks |
| `/summarize` | Summarize project health, blockers, and priorities |

### Build And Repair

| Command | Purpose |
|---|---|
| `/execute <goal>` | Run the autonomous agent loop on a concrete task |
| `/build [goal]` | Generate and apply code with build repair |
| `/autofix` | Run build/type checks and apply targeted fixes |
| `/debug` | Analyze build/runtime errors and stream fix guidance |
| `/run <cmd>` | Run a shell command through CodeThon policy gates |
| `/scaffold [dir]` | Generate a starter project |

### Inspect, Recover, Ship

| Command | Purpose |
|---|---|
| `/profile` | Find performance issues and code smells |
| `/review` | Inspect current git changes |
| `/diff` | Show the full git diff |
| `/checkpoint` | Save, list, and restore recovery points |
| `/recover` | Rebuild project context from local files |
| `/deploy` | Generate deployment guidance |
| `/readme` | Generate or refresh README.md |
| `/launch` | Generate demo script, submission copy, and launch assets |
| `/startup` | Analyze product and go-to-market potential |
| `/learn` | Ask a concept question and get a guided tutorial |

## Safety Model

CodeThon is designed to be useful without being reckless.

- `--ask` gates writes and command execution.
- `--dry-run` previews writes and commands.
- shell execution uses allowlisted binaries and blocked dangerous patterns.
- child-process environments are filtered for common secret patterns.
- provider credentials are stored outside project files.
- `.env` placeholder writes are rejected.
- long-running output is optimized for terminal scrollback.

Examples:

```text
/execute add password reset
/debug
/autofix
```

## Configuration

CodeThon stores CLI configuration under the user's home directory, not in the npm package folder and not in your project source.

Typical locations:

- config: `~/.codethon`
- project state: `~/.codethon/projects`
- recovery files: project-local `.codethon/recovery`
- credentials: OS-backed storage when available, with a local fallback

Use:

```text
/auth list
/auth test
/auth switch
/model
/doctor
```

## Release Readiness

The current build has been verified with:

```bash
npm run typecheck
npm test
npm run build
cd apps/cli && npm pack --dry-run
```

Additional npm-user smoke checks verified:

- packed package installs into a fresh project
- `ct --version` works from `node_modules/.bin`
- `ct status` works after local package install
- clean-home/no-config users get setup guidance instead of a crash
- `ct doctor` passes on the repository layout

Recommended release path:

```bash
npm publish --tag next
```

Promote to `latest` after a manual interactive terminal pass on Windows, macOS, and Linux.

## Development

```bash
git clone https://github.com/zubershk/CodeThon-CLI
cd CodeThon-CLI
npm install
npm run build
npm test
npm run typecheck
```

Run the local build:

```bash
node apps/cli/dist/index.js
```

Package inspection:

```bash
cd apps/cli
npm pack --dry-run
```

## Repository Layout

```text
apps/cli/
  src/
    commands/      command handlers
    cil/           autonomous loop, tools, build engine, state
    llm/           providers, routing, cache, cost tracking
    agents/        PM, architect, debug, devops, launch, mentor, startup
    ui/            terminal rendering and interaction helpers
    utils/         config, keychain, prompts, help, diagnostics
  __tests__/       Vitest coverage
  dist/            generated npm bundle

website/
  src/app/         Next.js app shell
  src/components/  landing page components
```

## Contributing

CodeThon is open source and intended to be hackable. Keep changes scoped, test command behavior from the built bundle, and keep README examples executable from a global npm install.

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
