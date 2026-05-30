# Contributing

CodeThon CLI should be easy to run from source, easy to package, and honest about what works from a global npm install.

## Local Setup

```bash
git clone https://github.com/zubershk/CodeThon-CLI
cd CodeThon-CLI
npm install
npm run build
node apps/cli/dist/index.js help
```

## Required Checks

Run these before opening a pull request:

```bash
npm run typecheck
npm test
npm run build
npm run smoke
```

## Package Check

The npm package should contain only the built CLI, README, and license.

```bash
cd apps/cli
npm pack --dry-run
```

## CLI Product Rules

- README examples must work from `npm install -g codethon-cli`.
- Prefer command aliases over breaking documented workflows.
- Keep Windows output scrollback-safe unless a terminal mode is proven stable.
- Do not silently switch providers or models when a user is setting up a project.
- Store secrets through `ct auth add`; do not ask npm users to edit repository files.
- AI-powered commands must fail fast with setup guidance when no provider is configured.

## Code Style

- Keep changes scoped.
- Prefer existing helpers in `src/utils`, `src/cil`, and `src/commands`.
- Add or update tests when behavior changes.
- Do not add new runtime dependencies unless the UX or safety gain is clear.

## Release Checklist

1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. `npm run smoke`
5. `cd apps/cli && npm pack --dry-run`
6. Test `node apps/cli/dist/index.js` in PowerShell and a Unix-like shell.
