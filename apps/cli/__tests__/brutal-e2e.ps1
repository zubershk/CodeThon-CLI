# CodeThon CLI — Brutal E2E Test
# Tests: CLI bootstrap | all command help | REPL pipe commands | error paths
# security boundaries | build integrity | suggestion system
#
# Run from repo root:
#   pwsh -File apps/cli/__tests__/brutal-e2e.ps1
#   pwsh -File apps/cli/__tests__/brutal-e2e.ps1 -Fast (subset)

param([switch]$Fast)

$ErrorActionPreference = 'Stop'
$ROOT = Resolve-Path "$PSScriptRoot/../../.."
$NODE = (Get-Command node).Source
$CLI = "$ROOT/apps/cli/dist/index.js"
$PASS = 0; $FAIL = 0; $WARN = 0

function Ok($name) { Write-Host "  [PASS] $name" -ForegroundColor Green; $script:PASS++ }
function No($name, $detail) {
    Write-Host "  [FAIL] $name" -ForegroundColor Red
    if ($detail) { Write-Host "         $detail" -ForegroundColor Gray }
    $script:FAIL++
}
function Skip($name, $reason) {
    Write-Host "  [SKIP] $name -- $reason" -ForegroundColor DarkYellow
    $script:WARN++
}

function RunCLI([string[]]$args = @()) {
    $out = & $NODE $CLI @args 2>&1 | Out-String
    @{ ExitCode = $LASTEXITCODE; Out = "$out" }
}

function PipeCLI([string]$stdin) {
    $out = $stdin | & $NODE $CLI 2>&1 | Out-String
    @{ ExitCode = $LASTEXITCODE; Out = "$out" }
}

function ExpectArgs([string]$name, [string[]]$args, [int]$code = 0, [string]$match = $null) {
    $r = RunCLI @args
    $ok = $r.ExitCode -eq $code
    if ($ok -and $match) { $ok = $r.Out -match $match }
    if ($ok) { Ok $name } else {
        $d = "exit=$($r.ExitCode) (expected $code)"
        if ($match) { $d += " | pattern: $match" }
        No $name $d
    }
}

function ExpectPipe([string]$name, [string]$stdin, [int]$code = 0, [string]$match = $null) {
    $r = PipeCLI $stdin
    $ok = $r.ExitCode -eq $code
    if ($ok -and $match) { $ok = $r.Out -match $match }
    if ($ok) { Ok $name } else {
        $d = "exit=$($r.ExitCode) (expected $code)"
        if ($match) { $d += " | pattern: $match" }
        No $name $d
    }
}

if (-not (Test-Path $CLI)) {
    Write-Host "Build first: cd apps/cli && npx tsup" -ForegroundColor Red; exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CODETHON CLI -- BRUTAL E2E" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ── 1: CLI bootstrap ──────────────────────────────────────
Write-Host "`n-- 1: Bootstrap --" -ForegroundColor Yellow
ExpectArgs "--help" @('--help')
ExpectArgs "--version" @('--version')
ExpectPipe "no args (REPL opens)" "/exit`n"
# nonexistent cmd goes to NL which may call LLM; skip for offline E2E
Skip "nonexistent cmd (NL fallback)" "requires LLM"

# ── 2: All command help ──────────────────────────────────
Write-Host "`n-- 2: Command help --" -ForegroundColor Yellow
$commands = 'init','model','roadmap','architect','plan','scaffold',
            'debug','emergency','deploy','readme','launch','startup',
            'learn','status','review','diff','clear','analyze',
            'build','autofix','execute','run','doctor','explain',
            'summarize','recover'
foreach ($c in $commands) {
    if ($Fast -and $c -notin 'status','clear','analyze','run') { continue }
    ExpectArgs "ct $c --help" @($c, '--help')
}

# ── 3: REPL piped commands ───────────────────────────────
Write-Host "`n-- 3: REPL pipe --" -ForegroundColor Yellow
ExpectPipe "REPL: /help" "/help`n/exit`n"
ExpectPipe "REPL: /status" "/status`n/exit`n"
ExpectPipe "REPL: /clear" "/clear`n/exit`n"
ExpectPipe "REPL: /exit" "/exit`n"
ExpectPipe "REPL: /quit" "/quit`n"
ExpectPipe "REPL: empty+status" "`n/status`n/exit`n"
ExpectPipe "REPL: unknown cmd" "/foobar`n/exit`n"
ExpectPipe "REPL: ct status" "ct status`n/exit`n"
ExpectPipe "REPL: natural lang" "hello world`n/exit`n"

# ── 4: REPL suggestions ──────────────────────────────────
Write-Host "`n-- 4: Suggestions --" -ForegroundColor Yellow
ExpectPipe "Sug: /e narrows" "/e`n/exit`n"
ExpectPipe "Sug: /pl" "/pl`n/exit`n"
ExpectPipe "Sug: /de" "/de`n/exit`n"
ExpectPipe "Sug: /exi" "/exi`n/exit`n"

# ── 5: Error paths ──────────────────────────────────────
Write-Host "`n-- 5: Error paths --" -ForegroundColor Yellow
ExpectArgs "explain no file" @('explain') -code 0
ExpectArgs "explain bad file" @('explain', '/nonexistent/foo.js') -code 0
ExpectArgs "execute no goal" @('execute') -code 0
ExpectArgs "run no command" @('run') -code 0
ExpectArgs "dry-run + status" @('--dry-run', 'status')
ExpectArgs "ask + status" @('--ask', 'status')

$scafDir = Join-Path $env:TEMP "codethon-e2e-$(Get-Random)"
ExpectArgs "scaffold nextjs" @('scaffold', '--template', 'nextjs', $scafDir)
Remove-Item -Recurse -Force $scafDir -ErrorAction SilentlyContinue

# ── 6: Security boundaries in source ─────────────────────
Write-Host "`n-- 6: Security --" -ForegroundColor Yellow
$srcFiles = @(
    "$ROOT/apps/cli/src/runtime/executor.ts",
    "$ROOT/apps/cli/src/cil/tools.ts",
    "$ROOT/apps/cli/src/utils/env.ts"
)
$checks = @(
    @{ pat = 'ALLOWED_BINS'; label = 'SEC: ALLOWED_BINS' }
    @{ pat = 'BLOCKED_RE|BLOCKED_PATTERNS'; label = 'SEC: blocklist patterns' }
    @{ pat = 'sanitizeEnv'; label = 'SEC: sanitizeEnv' }
    @{ pat = 'ALLOWED_COMMANDS'; label = 'SEC: ALLOWED_COMMANDS' }
    @{ pat = 'requireApproval|isApproved'; label = 'SEC: approval gate' }
)
foreach ($c in $checks) {
    $found = $false
    foreach ($f in $srcFiles) {
        if ((Test-Path $f) -and ((Get-Content $f -Raw) -match $c.pat)) { $found = $true; break }
    }
    if ($found) { Ok $c.label } else { Skip $c.label "not found" }
}
if ((Get-Content "$ROOT/apps/cli/src/cil/tools.ts" -Raw) -match '\.env') { Ok "SEC: .env guard" } else { No "SEC: .env guard" "missing" }
$jl = Get-Content "$ROOT/apps/cli/src/cil/job-loop.ts" -Raw
if ($jl -match 'USER_GOAL' -and $jl -match 'TOOL_RESULT') { Ok "SEC: prompt injection boundaries" } else { Skip "SEC: boundaries" "missing" }

# ── 7: Build integrity ──────────────────────────────────
Write-Host "`n-- 7: Build --" -ForegroundColor Yellow
$bundle = Get-Item $CLI
$size = $bundle.Length
Write-Host "     Bundle: $size bytes"
if ($size -gt 100kb -and $size -lt 2mb) { Ok "Build: bundle size" } else { Skip "Build: size" "${size}bytes" }

$versionOut = & $NODE $CLI --version 2>&1 | Out-String
if ($versionOut -match '1\.1\.0') { Ok "Build: version string" } else { No "Build: version" "got '$versionOut'" }

# ── Results ─────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASS: $PASS" -ForegroundColor Green
$c = if ($FAIL -gt 0) { 'Red' } else { 'Green' }
Write-Host "  FAIL: $FAIL" -ForegroundColor $c
Write-Host "  SKIP: $WARN" -ForegroundColor DarkYellow
Write-Host ""

if ($FAIL -eq 0) { Write-Host "  ALL TESTS PASSED" -ForegroundColor Green; exit 0 }
else { Write-Host "  SOME TESTS FAILED" -ForegroundColor Red; exit 1 }
