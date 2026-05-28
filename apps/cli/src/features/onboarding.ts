import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

export interface OnboardingState {
  completed: boolean;
  step: number;
  modelConfigured: boolean;
  apiKeysSet: string[];
  projectCreated: boolean;
  theme: 'dark' | 'light';
}

const STEPS = [
  'Welcome to CodeThon CLI v2!',
  'Configure your AI model',
  'Set up API keys',
  'Choose your theme',
  'Create your first project',
  'Ready to build!',
];

export class OnboardingWizard {
  private statePath: string;
  private state: OnboardingState;

  constructor() {
    this.statePath = path.join(os.homedir(), '.codethon', 'onboarding.json');
    this.state = this.load();
  }

  private load(): OnboardingState {
    try {
      if (fs.existsSync(this.statePath)) {
        return JSON.parse(fs.readFileSync(this.statePath, 'utf-8'));
      }
    } catch { /* ignore */ }
    return {
      completed: false,
      step: 0,
      modelConfigured: false,
      apiKeysSet: [],
      projectCreated: false,
      theme: 'dark',
    };
  }

  private save(): void {
    const dir = path.dirname(this.statePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  isComplete(): boolean {
    return this.state.completed;
  }

  currentStep(): number {
    return this.state.step;
  }

  progress(): string {
    return `${this.state.step}/${STEPS.length - 1}`;
  }

  async run(): Promise<void> {
    if (this.state.completed) return;

    console.log('\n' + '='.repeat(60));
    console.log('  Welcome to CodeThon CLI v2!');
    console.log('  Let\'s get you set up in 2 minutes.');
    console.log('='.repeat(60) + '\n');

    this.state.step = 1;
    this.save();

    await this.configureAPIKeys();
    this.state.modelConfigured = true;
    this.save();

    await this.chooseTheme();
    this.save();

    this.state.completed = true;
    this.save();

    console.log('\n' + '='.repeat(60));
    console.log('  Setup complete! You\'re ready to build.');
    console.log('  Try:');
    console.log('    ct plan --feature "your idea"');
    console.log('    ct scaffold');
    console.log('    ct execute "build my app"');
    console.log('='.repeat(60) + '\n');
  }

  private async configureAPIKeys(): Promise<void> {
    console.log('\n--- Configure AI Models ---\n');
    console.log('CodeThon works with multiple AI providers.');
    console.log('Set at least one API key to get started:\n');

    const providers = [
      { name: 'OpenAI', env: 'OPENAI_API_KEY', url: 'https://platform.openai.com/api-keys' },
      { name: 'Anthropic Claude', env: 'ANTHROPIC_API_KEY', url: 'https://console.anthropic.com/settings/keys' },
      { name: 'Groq (FREE)', env: 'GROQ_API_KEY', url: 'https://console.groq.com/keys' },
      { name: 'DeepSeek', env: 'DEEPSEEK_API_KEY', url: 'https://platform.deepseek.com/api_keys' },
    ];

    const found: string[] = [];
    const missing: string[] = [];

    for (const p of providers) {
      if (process.env[p.env]) {
        found.push(p.env);
        console.log(`  ✓ ${p.name} — ${p.env} is set`);
      } else {
        missing.push(p.env);
        console.log(`  ○ ${p.name} — ${p.env} not set`);
        console.log(`    Get key: ${p.url}`);
      }
    }

    this.state.apiKeysSet = found;

    if (found.length === 0) {
      console.log('\n  No API keys found. You can still use local models:');
      console.log('    • Ollama: https://ollama.ai — run models locally');
      console.log('    • LM Studio: https://lmstudio.ai — local LLM server');
    }

    console.log('');
  }

  private async chooseTheme(): Promise<void> {
    console.log('\n--- Choose Your Theme ---\n');
    console.log('  1. Dark theme (recommended)');
    console.log('  2. Light theme');
    console.log('');

    this.state.theme = 'dark';
    console.log('  Theme set to: Dark');
    console.log('  (Use `ct config set theme light` to change later)\n');
  }
}
