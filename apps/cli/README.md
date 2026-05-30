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

| Input | Result |
|---|---|
| `/` | Open the slash-command palette |
| `/p` | Filter commands such as `/plan` and `/profile` |
| `/help` | Show categorized command help |
| plain English | Ask the configured AI provider |

## Common Workflow

```bash
ct auth add
ct init
ct plan "build a Next.js dashboard with Supabase auth"
ct execute "implement the dashboard shell and auth flow"
ct profile
ct doctor
ct review
```

Inside the REPL, use slash commands:

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
| `ct onboard` | Run guided setup again |
| `ct auth add` | Add and validate a provider credential |
| `ct auth list` | Show configured providers and active model |
| `ct auth test [provider]` | Test provider authentication |
| `ct auth switch` | Switch provider and model |
| `ct auth remove [provider]` | Remove a provider credential |
| `ct auth logout` | Remove credentials and reset auth state |
| `ct model` | Browse and switch models |
| `ct doctor` | Diagnose Node, Git, config, auth, network, and project health |

### Plan And Understand

| Command | Purpose |
|---|---|
| `ct init` | Create or register a project workspace |
| `ct plan [goal]` | Stream roadmap and architecture generation |
| `ct roadmap` | Generate phases and milestones |
| `ct architect` | Generate architecture and stack guidance |
| `ct analyze [dir]` | Scan project structure and stream an AI summary |
| `ct explain <file>` | Explain a file and its risks |
| `ct summarize` | Summarize project health, blockers, and priorities |

### Build And Repair

| Command | Purpose |
|---|---|
| `ct execute <goal>` | Run the autonomous agent loop on a concrete task |
| `ct build [goal]` | Generate and apply code with build repair |
| `ct autofix` | Run build/type checks and apply targeted fixes |
| `ct debug` | Analyze errors and stream fix guidance |
| `ct run <cmd>` | Run a shell command through policy gates |
| `ct scaffold [dir]` | Generate a starter project |

### Inspect, Recover, Ship

| Command | Purpose |
|---|---|
| `ct profile` | Find performance issues and code smells |
| `ct review` | Inspect current git changes |
| `ct diff` | Show the full git diff |
| `ct checkpoint` | Save, list, and restore recovery points |
| `ct recover` | Rebuild project context from local files |
| `ct deploy` | Generate deployment guidance |
| `ct readme` | Generate or refresh README.md |
| `ct launch` | Generate demo script and submission copy |
| `ct startup` | Analyze product and go-to-market potential |
| `ct learn` | Ask a concept question and get a guided tutorial |

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

```bash
ct --ask execute "add password reset"
ct --dry-run execute "refactor billing components"
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
