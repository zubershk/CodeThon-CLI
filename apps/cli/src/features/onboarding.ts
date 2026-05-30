import fs from 'fs';
import path from 'path';
import os from 'os';

export interface OnboardingState {
  completed: boolean;
  provider: string;
  model: string;
  apiKeySet: boolean;
  setupAt: string;
}

const statePath = path.join(os.homedir(), '.codethon', 'onboarding.json');

function load(): OnboardingState {
  try {
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {
    completed: false,
    provider: '',
    model: '',
    apiKeySet: false,
    setupAt: '',
  };
}

export function getOnboardingState(): OnboardingState {
  return load();
}

export function isOnboardingComplete(): boolean {
  const state = load();
  return state.completed;
}

export function saveOnboardingComplete(data: { provider: string; model: string; apiKeySet: boolean }): void {
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const state: OnboardingState = {
    completed: true,
    provider: data.provider,
    model: data.model,
    apiKeySet: data.apiKeySet,
    setupAt: new Date().toISOString(),
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

export class OnboardingWizard {
  isComplete(): boolean {
    return isOnboardingComplete();
  }

  currentStep(): number {
    return 5;
  }

  progress(): string {
    return '5/5';
  }
}
