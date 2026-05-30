# CodeThon CLI

Provider-agnostic AI coding agent for the terminal. CodeThon helps you configure a model, understand a repo, plan the work, execute concrete tasks, recover from failures, and ship from one CLI.

```bash
npm install -g codethon-cli
ct
```

Current package: `codethon-cli@1.0.0`

## First Run

Run `ct`.

If no working provider is configured, CodeThon starts guided setup:

1. Choose OpenAI, Anthropic, NVIDIA, Groq, DeepSeek, Together, Ollama, or LM Studio.
2. Enter an API key when the provider requires one.
3. Validate the key.
4. Select a model.
5. Run a test request.
6. Save config and show next actions.

CodeThon stores configuration in the user's home directory, not inside the npm package folder and not inside your source tree.

## Interactive Mode

```text
CodeThon >
```

Use `ct` once to open the workspace, then use slash commands inside CodeThon.
Standalone commands such as `ct doctor` still work for scripts, but the primary
builder workflow is `/init`, `/plan`, `/execute`, `/analyze`, and `/profile`.

| Input | Result |
|---|---|
| `/` | Open the slash-command palette |
| `/p` | Filter commands such as `/plan` and `/profile` |
| `/help` | Show categorized command help |
| plain English | Ask the configured AI provider |

## Common Workflow

```text
/auth add
/init
/plan build a Next.js dashboard with Supabase auth
/execute implement the dashboard shell and auth flow
/profile
/doctor
```

## Commands

### Setup

| Command | Purpose |
|---|---|
| `/onboard` | Run guided setup again |
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
| `/architect` | Generate architecture and stack guidance |
| `/analyze [dir]` | Scan project structure and stream an AI summary |
| `/explain <file>` | Explain a file and its risks |
| `/summarize` | Summarize project health, blockers, and priorities |

### Build And Repair

| Command | Purpose |
|---|---|
| `/execute <goal>` | Run the autonomous agent loop on a concrete task |
| `/build [goal]` | Generate and apply code with build repair |
| `/autofix` | Run build/type checks and apply targeted fixes |
| `/debug` | Analyze errors and stream fix guidance |
| `/run <cmd>` | Run a shell command through policy gates |
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
| `/launch` | Generate demo script and submission copy |
| `/startup` | Analyze product and go-to-market potential |
| `/learn` | Ask a concept question and get a guided tutorial |

## Providers

| Provider | Credential |
|---|---|
| NVIDIA | `NVIDIA_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Groq | `GROQ_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Together AI | `TOGETHER_API_KEY` |
| Ollama | none |
| LM Studio / local server | none |

## Safety

- `--ask` gates writes and command execution.
- `--dry-run` previews operations.
- shell execution uses allowlisted binaries and blocked dangerous patterns.
- child-process environments are filtered for common secret patterns.
- provider credentials are stored outside project files.
- `.env` placeholder writes are rejected.

```text
/execute add password reset
/debug
/autofix
```

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

Inspect the npm package:

```bash
cd apps/cli
npm pack --dry-run
```

## License

MIT
