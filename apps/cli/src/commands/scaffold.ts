import fs from 'fs';
import path from 'path';
import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { executeCommand } from '../runtime';
import { createSpinner, logger, section } from '../utils';
import { ensureDir, writeFile } from '../utils/file-utils';

const DASHBOARD_PAGE = `'use client';

import { useState, useEffect } from 'react';

function HealthGauge({ score, label }: { score: number; label: string }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score > 70 ? '#22c55e' : score > 40 ? '#eab308' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={72} height={72} className="transform -rotate-90">
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute text-lg font-bold font-mono mt-7" style={{ color }}>{score}%</span>
      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">{label}</span>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
      <div className={\`w-2 h-2 rounded-full \${color}\`} />
      <div>
        <div className="text-xs text-zinc-500">{label}</div>
        <div className="text-sm font-semibold text-zinc-100">{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [health, setHealth] = useState({ overall: 65, mvp: 45, deploy: 20, launch: 10 });
  const [activeTab, setActiveTab] = useState<'plan' | 'chat' | 'launch'>('plan');

  useEffect(() => {
    const interval = setInterval(() => {
      setHealth(h => ({
        overall: Math.min(100, h.overall + 2),
        mvp: Math.min(100, h.mvp + 3),
        deploy: Math.min(100, h.deploy + 1),
        launch: Math.min(100, h.launch + 1),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-lg">&#9679;&#9679;&#9679;</span>
            <span className="text-sm font-bold text-zinc-100">CodeThon</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Building
            </span>
            <span className="font-mono">24h left</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            {/* Health Row */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-400/20 flex items-center justify-center text-[8px] text-emerald-400 font-bold">&#9881;</span>
                  System Health
                </span>
                <span className="text-[10px] font-mono text-zinc-600">updated just now</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="relative flex flex-col items-center">
                  <HealthGauge score={health.overall} label="Overall" />
                </div>
                <div className="relative flex flex-col items-center">
                  <HealthGauge score={health.mvp} label="MVP" />
                </div>
                <div className="relative flex flex-col items-center">
                  <HealthGauge score={health.deploy} label="Deploy" />
                </div>
                <div className="relative flex flex-col items-center">
                  <HealthGauge score={health.launch} label="Launch" />
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex gap-4 mb-4 border-b border-zinc-800 pb-3">
                {(['plan', 'chat', 'launch'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={\`text-xs font-semibold uppercase tracking-widest pb-1 transition-colors \${activeTab === tab ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}\`}>
                    {tab === 'plan' ? 'Planning Board' : tab === 'chat' ? 'AI Chat' : 'Launch Checklist'}
                  </button>
                ))}
              </div>

              {activeTab === 'plan' && (
                <div className="space-y-2">
                  {[
                    { title: 'Set up project scaffold', status: 'done' as const },
                    { title: 'Build core UI components', status: 'doing' as const },
                    { title: 'Connect to Supabase', status: 'todo' as const },
                    { title: 'AI integration', status: 'todo' as const },
                    { title: 'Deploy to Vercel', status: 'todo' as const },
                  ].map(task => (
                    <div key={task.title} className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm \${task.status === 'done' ? 'bg-emerald-500/5' : task.status === 'doing' ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-zinc-900/30'}\`}>
                      <div className={\`w-4 h-4 rounded-full border-2 flex items-center justify-center \${task.status === 'done' ? 'border-emerald-500 bg-emerald-500' : task.status === 'doing' ? 'border-blue-500' : 'border-zinc-700'}\`}>
                        {task.status === 'done' && <span className="text-[8px] text-white">&#10003;</span>}
                        {task.status === 'doing' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                      </div>
                      <span className={\`\${task.status === 'done' ? 'line-through text-zinc-600' : task.status === 'doing' ? 'text-blue-300 font-medium' : 'text-zinc-400'}\`}>{task.title}</span>
                      {task.status === 'doing' && <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono">IN PROGRESS</span>}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="space-y-4">
                  <div className="bg-zinc-900/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 font-bold">AI</div>
                      <div>
                        <p className="text-sm text-zinc-300">Welcome to your project! I can help you with:</p>
                        <ul className="mt-2 space-y-1 text-sm text-zinc-500">
                          <li>&bull; Writing components and pages</li>
                          <li>&bull; Debugging errors</li>
                          <li>&bull; Setting up Supabase</li>
                          <li>&bull; Deployment tips</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Ask me anything..." className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50" />
                    <button className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors">Send</button>
                  </div>
                </div>
              )}

              {activeTab === 'launch' && (
                <div className="space-y-2">
                  {[
                    { item: 'Write README', done: false },
                    { item: 'Record demo video', done: false },
                    { item: 'Prepare pitch deck', done: false },
                    { item: 'Deploy to production', done: false },
                    { item: 'Test on fresh install', done: false },
                  ].map((check, i) => (
                    <label key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-900/30 cursor-pointer group">
                      <div className={\`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors \${check.done ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-700 group-hover:border-zinc-500'}\`}>
                        {check.done && <span className="text-[8px] text-white">&#10003;</span>}
                      </div>
                      <span className={\`text-sm \${check.done ? 'line-through text-zinc-600' : 'text-zinc-400'}\`}>{check.item}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Quick Actions</span>
              <div className="mt-3 space-y-1">
                {['ct roadmap', 'ct architect', 'ct debug', 'ct deploy'].map(cmd => (
                  <button key={cmd} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 transition-colors text-left group">
                    <code className="text-emerald-400 font-mono">{cmd}</code>
                    <span className="text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] ml-auto">copy</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Stack</span>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['Next.js', 'Tailwind', 'Supabase'].map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">{s}</span>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Metrics</span>
              <div className="mt-3 space-y-2">
                <MetricCard label="Tasks" value="5 total, 1 in progress" color="bg-emerald-500" />
                <MetricCard label="Health" value="65% overall" color="bg-yellow-500" />
                <MetricCard label="Status" value="Building phase" color="bg-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const LAYOUT_TSX = `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeThon Project',
  description: 'Built with CodeThon CLI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
`;

const GLOBALS_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #09090b;
  --foreground: #f4f4f5;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

::selection {
  background: rgba(52, 211, 153, 0.2);
  color: #f4f4f5;
}

::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
}
`;

const TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#34d399',
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
    },
  },
  plugins: [],
};
`;

const SUPABASE_CLIENT = `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getTasks() {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTask(title: string) {
  const { data, error } = await supabase.from('tasks').insert({ title }).select().single();
  if (error) throw error;
  return data;
}

export async function updateTaskStatus(id: string, status: string) {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
  if (error) throw error;
}
`;

const PACKAGE_JSON = JSON.stringify({
  name: 'codethon-project',
  version: '0.1.0',
  private: true,
  scripts: {
    dev: 'next dev',
    build: 'next build',
    start: 'next start',
  },
  dependencies: {
    next: '^14.2.0',
    react: '^18.3.0',
    'react-dom': '^18.3.0',
    '@supabase/supabase-js': '^2.45.0',
  },
  devDependencies: {
    '@types/node': '^20.14.0',
    '@types/react': '^18.3.0',
    '@types/react-dom': '^18.3.0',
    typescript: '^5.4.0',
    tailwindcss: '^3.4.0',
    postcss: '^8.4.0',
    autoprefixer: '^10.4.0',
  },
}, null, 2);

const POSTCSS_CONFIG = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
module.exports = nextConfig;
`;

const ENV_LOCAL = `# CodeThon Project - Environment Variables
# Get these values from your Supabase project dashboard

NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
`;

const TEMPLATES: Record<string, Record<string, string>> = {
  'Next.js + TailwindCSS': {
    'package.json': PACKAGE_JSON,
    'next.config.js': NEXT_CONFIG,
    'tsconfig.json': TSCONFIG,
    'postcss.config.js': POSTCSS_CONFIG,
    'tailwind.config.js': TAILWIND_CONFIG,
    'app/globals.css': GLOBALS_CSS,
    'app/layout.tsx': LAYOUT_TSX,
    'app/page.tsx': DASHBOARD_PAGE,
    'app/lib/supabase.ts': SUPABASE_CLIENT,
    '.env.local': ENV_LOCAL,
  },
};

export async function scaffoldCommand(targetDir?: string): Promise<CommandResult> {
  section('CodeThon CLI — Project Scaffold');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  const dir = targetDir || process.cwd();
  const projectDir = path.join(dir, project.name?.toLowerCase().replace(/\s+/g, '-') || 'codethon-project');

  if (fs.existsSync(projectDir)) {
    logger.warn(`Directory already exists: ${projectDir}`);
    logger.info('If you want to re-scaffold, delete it first:');
    logger.commandBlock(`Remove-Item -Recurse -Force "${projectDir}"`);
    return { success: false, message: 'Project directory already exists' };
  }

  const template = TEMPLATES['Next.js + TailwindCSS'];
  if (!template) {
    logger.warn('No scaffold template available for this stack. Creating basic structure.');
    ensureDir(path.join(projectDir, 'src'));
    writeFile(path.join(projectDir, 'README.md'), `# ${project.name}\n\n${project.idea}\n`);
    logger.success(`Created basic project structure at ${projectDir}`);
    return { success: true, message: 'Basic scaffold created' };
  }

  const spinner = createSpinner('Scaffolding project...');
  spinner.start();

  try {
    for (const [filePath, content] of Object.entries(template)) {
      const fullPath = path.join(projectDir, filePath);
      ensureDir(path.dirname(fullPath));
      writeFile(fullPath, content);
      spinner.update(`Creating ${filePath}...`);
    }

    spinner.succeed(`Project scaffolded at ${projectDir}`);

    logger.info('');
    logger.info('Installing dependencies...');
    const installResult = executeCommand('npm install', 180000);
    if (installResult.success) {
      logger.success('Dependencies installed!');
    } else {
      logger.warn(`Install had issues: ${installResult.stderr.substring(0, 200)}`);
    }

    logger.info('');
    logger.divider();
    logger.info('');
    logger.success('Your project is ready!');
    logger.info('');
    logger.commandBlock(`cd ${path.relative(process.cwd(), projectDir)}`);
    logger.commandBlock('npm run dev');
    logger.info('');
    logger.info('Open http://localhost:3000 to see your dashboard');

    state.updateProject({ sprintPhase: 'building' });

    return { success: true, message: `Project scaffolded at ${projectDir}`, data: { path: projectDir } };
  } catch (error) {
    spinner.fail('Failed to scaffold project');
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Failed to scaffold project' };
  }
}
