export interface Template {
  name: string;
  description: string;
  installCmd: string;
  files: Record<string, string>;
}

const NEXTJS_TAILWIND: Template = {
  name: 'Next.js + TailwindCSS + Supabase',
  description: 'Full-stack Next.js app with TailwindCSS styling and Supabase backend',
  installCmd: 'npm install',
  files: {
    'package.json': JSON.stringify({
      name: 'codethon-project',
      version: '0.1.0',
      private: true,
      scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      dependencies: { next: '^14.2.0', react: '^18.3.0', 'react-dom': '^18.3.0', '@supabase/supabase-js': '^2.45.0' },
      devDependencies: { '@types/node': '^20.14.0', '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0', typescript: '^5.4.0', tailwindcss: '^3.4.0', postcss: '^8.4.0', autoprefixer: '^10.4.0' },
    }, null, 2),
    'next.config.js': `/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
module.exports = nextConfig;`,
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'es2017', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: true, skipLibCheck: true,
        strict: true, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler',
        resolveJsonModule: true, isolatedModules: true, jsx: 'preserve', incremental: true,
        plugins: [{ name: 'next' }], paths: { '@/*': ['./*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    }, null, 2),
    'postcss.config.js': `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };`,
    'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: { extend: { colors: { primary: { DEFAULT: '#34d399', 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' } } } },
  plugins: [],
};`,
    'app/globals.css': `@tailwind base; @tailwind components; @tailwind utilities;
:root { --background: #09090b; --foreground: #f4f4f5; }
body { background: var(--background); color: var(--foreground); font-family: 'Inter', system-ui, -apple-system, sans-serif; }
::selection { background: rgba(52, 211, 153, 0.2); color: #f4f4f5; }`,
    'app/layout.tsx': `import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'CodeThon Project', description: 'Built with CodeThon CLI' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className="dark"><body className="antialiased">{children}</body></html>;
}`,
    'app/page.tsx': `'use client';
import { useState, useEffect } from 'react';
function HealthGauge({ score, label }: { score: number; label: string }) {
  const r = 28; const circ = 2 * Math.PI * r;
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
export default function Dashboard() {
  const [health, setHealth] = useState({ overall: 65, mvp: 45, deploy: 20, launch: 10 });
  const [activeTab, setActiveTab] = useState<'plan' | 'chat' | 'launch'>('plan');
  useEffect(() => {
    const interval = setInterval(() => { setHealth(h => ({ overall: Math.min(100, h.overall + 2), mvp: Math.min(100, h.mvp + 3), deploy: Math.min(100, h.deploy + 1), launch: Math.min(100, h.launch + 1) })); }, 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="text-emerald-400 text-lg">•••</span><span className="text-sm font-bold text-zinc-100">CodeThon</span></div>
          <div className="flex items-center gap-4 text-xs text-zinc-500"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Building</span><span className="font-mono">24h left</span></div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-5"><span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-400/20 flex items-center justify-center text-[8px] text-emerald-400 font-bold">&#9881;</span>System Health</span><span className="text-[10px] font-mono text-zinc-600">updated just now</span></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <HealthGauge score={health.overall} label="Overall" />
                <HealthGauge score={health.mvp} label="MVP" />
                <HealthGauge score={health.deploy} label="Deploy" />
                <HealthGauge score={health.launch} label="Launch" />
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <div className="flex gap-4 mb-4 border-b border-zinc-800 pb-3">
                {(['plan', 'chat', 'launch'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={\`text-xs font-semibold uppercase tracking-widest pb-1 transition-colors \${activeTab === tab ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-600 hover:text-zinc-400'}\`}>{tab === 'plan' ? 'Planning Board' : tab === 'chat' ? 'AI Chat' : 'Launch Checklist'}</button>
                ))}
              </div>
              {activeTab === 'plan' && (<div className="space-y-2">{[{ title: 'Set up project scaffold', status: 'done' }, { title: 'Build core UI components', status: 'doing' }, { title: 'Connect to Supabase', status: 'todo' }, { title: 'AI integration', status: 'todo' }, { title: 'Deploy to Vercel', status: 'todo' }].map(task => (<div key={task.title} className={\`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm \${task.status === 'done' ? 'bg-emerald-500/5' : task.status === 'doing' ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-zinc-900/30'}\`}><div className={\`w-4 h-4 rounded-full border-2 flex items-center justify-center \${task.status === 'done' ? 'border-emerald-500 bg-emerald-500' : task.status === 'doing' ? 'border-blue-500' : 'border-zinc-700'}\`}>{task.status === 'done' && <span className="text-[8px] text-white">✓</span>}{task.status === 'doing' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}</div><span className={\`\${task.status === 'done' ? 'line-through text-zinc-600' : task.status === 'doing' ? 'text-blue-300 font-medium' : 'text-zinc-400'}\`}>{task.title}</span></div>))}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,
    'app/lib/supabase.ts': `import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);
export async function getTasks() { const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }); if (error) throw error; return data; }
export async function createTask(title: string) { const { data, error } = await supabase.from('tasks').insert({ title }).select().single(); if (error) throw error; return data; }
export async function updateTaskStatus(id: string, status: string) { const { error } = await supabase.from('tasks').update({ status }).eq('id', id); if (error) throw error; }`,
    '.env.local': `# CodeThon Project
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`,
  },
};

const REACT_VITE: Template = {
  name: 'React + Vite + TypeScript',
  description: 'Lightning-fast React SPA with Vite bundler and TypeScript',
  installCmd: 'npm install',
  files: {
    'package.json': JSON.stringify({
      name: 'vite-react-app',
      version: '0.1.0',
      private: true,
      type: 'module',
      scripts: { dev: 'vite', build: 'tsc -b && vite build', preview: 'vite preview' },
      dependencies: { react: '^18.3.0', 'react-dom': '^18.3.0' },
      devDependencies: { '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0', '@vitejs/plugin-react': '^4.3.0', typescript: '^5.4.0', vite: '^5.4.0' },
    }, null, 2),
    'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });`,
    'tsconfig.json': JSON.stringify({
      compilerOptions: { target: 'ES2020', useDefineForClassFields: true, lib: ['ES2020', 'DOM', 'DOM.Iterable'], module: 'ESNext', skipLibCheck: true, moduleResolution: 'bundler', allowImportingTsExtensions: true, isolatedModules: true, moduleDetection: 'force', noEmit: true, jsx: 'react-jsx', strict: true, noUnusedLocals: true, noUnusedParameters: true, noFallthroughCasesInSwitch: true, forceConsistentCasingInFileNames: true },
      include: ['src'],
    }, null, 2),
    'tsconfig.node.json': JSON.stringify({
      compilerOptions: { target: 'ES2022', lib: ['ES2023'], module: 'ESNext', skipLibCheck: true, moduleResolution: 'bundler', allowImportingTsExtensions: true, isolatedModules: true, moduleDetection: 'force', noEmit: true, strict: true, noUnusedLocals: true, noUnusedParameters: true, noFallthroughCasesInSwitch: true, forceConsistentCasingInFileNames: true },
      include: ['vite.config.ts'],
    }, null, 2),
    'index.html': `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>CodeThon App</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>`,
    'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);`,
    'src/App.tsx': `import { useState } from 'react';
import './App.css';
function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="app">
      <header className="app-header">
        <h1>CodeThon React App</h1>
        <p>Edit <code>src/App.tsx</code> to get started</p>
        <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      </header>
    </div>
  );
}
export default App;`,
    'src/App.css': `.app { max-width: 800px; margin: 0 auto; padding: 2rem; text-align: center; }
.app-header { background: #1a1a2e; border-radius: 12px; padding: 3rem 2rem; color: #e4e4e7; }
.app-header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
.app-header p { color: #a1a1aa; margin-bottom: 1.5rem; }
.app-header code { background: rgba(255,255,255,0.06); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9rem; }
.app-header button { background: #6366f1; color: white; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
.app-header button:hover { background: #4f46e5; }`,
    'src/index.css': `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #0f0f13; color: #e4e4e7; min-height: 100vh; }`,
    'src/vite-env.d.ts': `/// <reference types="vite/client" />`,
  },
};

const EXPRESS_API: Template = {
  name: 'Express.js + TypeScript API',
  description: 'Production-ready REST API with Express, TypeScript, error handling, and routing',
  installCmd: 'npm install',
  files: {
    'package.json': JSON.stringify({
      name: 'express-api',
      version: '0.1.0',
      private: true,
      scripts: { dev: 'tsx watch src/index.ts', build: 'tsc', start: 'node dist/index.js' },
      dependencies: { express: '^4.21.0', cors: '^2.8.5', helmet: '^7.1.0', morgan: '^1.10.0' },
      devDependencies: { '@types/express': '^4.17.21', '@types/cors': '^2.8.17', '@types/morgan': '^1.9.9', '@types/node': '^20.14.0', typescript: '^5.4.0', tsx: '^4.16.0' },
    }, null, 2),
    'tsconfig.json': JSON.stringify({
      compilerOptions: { target: 'ES2020', module: 'commonjs', lib: ['ES2020'], outDir: './dist', rootDir: './src', strict: true, esModuleInterop: true, skipLibCheck: true, forceConsistentCasingInFileNames: true, resolveJsonModule: true, declaration: true, declarationMap: true, sourceMap: true },
      include: ['src'],
      exclude: ['node_modules', 'dist'],
    }, null, 2),
    'src/index.ts': `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { apiRouter } from './routes/api';
import { errorHandler } from './middleware/error-handler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });

app.use('/api', apiRouter);

app.use(errorHandler);

app.listen(PORT, () => { console.log(\`Server running on http://localhost:\${PORT}\`); });

export default app;`,
    'src/routes/api.ts': `import { Router, Request, Response } from 'express';

export const apiRouter = Router();

interface Task { id: string; title: string; completed: boolean; createdAt: string; }
const tasks: Task[] = [
  { id: '1', title: 'Set up Express server', completed: true, createdAt: new Date().toISOString() },
  { id: '2', title: 'Add API routes', completed: false, createdAt: new Date().toISOString() },
];

apiRouter.get('/tasks', (_req: Request, res: Response) => { res.json({ tasks }); });

apiRouter.get('/tasks/:id', (req: Request, res: Response) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  res.json({ task });
});

apiRouter.post('/tasks', (req: Request, res: Response) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string') { res.status(400).json({ error: 'Title is required' }); return; }
  const task: Task = { id: String(tasks.length + 1), title, completed: false, createdAt: new Date().toISOString() };
  tasks.push(task);
  res.status(201).json({ task });
});

apiRouter.put('/tasks/:id', (req: Request, res: Response) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  if (typeof req.body.title === 'string') task.title = req.body.title;
  if (typeof req.body.completed === 'boolean') task.completed = req.body.completed;
  res.json({ task });
});

apiRouter.delete('/tasks/:id', (req: Request, res: Response) => {
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: 'Task not found' }); return; }
  tasks.splice(idx, 1);
  res.status(204).send();
});`,
    'src/middleware/error-handler.ts': `import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error { statusCode?: number; }

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;
  if (statusCode === 500) console.error('[ERROR]', err);
  res.status(statusCode).json({ error: message, statusCode });
}

export function createError(statusCode: number, message: string): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  return err;
}`,
    '.env.example': `PORT=3001
NODE_ENV=development`,
  },
};

const FASTAPI: Template = {
  name: 'Python FastAPI',
  description: 'Modern async Python API with FastAPI, auto-docs, and SQLite',
  installCmd: 'pip install -r requirements.txt',
  files: {
    'requirements.txt': `fastapi==0.115.0\nuvicorn==0.30.0\nsqlalchemy==2.0.35\nalembic==1.13.0\npydantic==2.9.0\npython-dotenv==1.0.1`,
    'main.py': `import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    uvicorn.run("app.app:app", host="0.0.0.0", port=8000, reload=True)`,
    'app/__init__.py': ``,
    'app/app.py': `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import router

app = FastAPI(
    title="CodeThon API",
    description="Built with CodeThon CLI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": __import__("datetime").datetime.now().isoformat()}`,
    'app/routes.py': `from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

class TaskCreate(BaseModel):
    title: str

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None

class Task(BaseModel):
    id: str
    title: str
    completed: bool = False
    created_at: str = ""

_tasks: list[dict] = [
    {"id": "1", "title": "Set up FastAPI server", "completed": True, "created_at": datetime.now().isoformat()},
    {"id": "2", "title": "Add API routes", "completed": False, "created_at": datetime.now().isoformat()},
]

@router.get("/tasks")
async def list_tasks():
    return {"tasks": _tasks}

@router.get("/tasks/{task_id}")
async def get_task(task_id: str):
    task = next((t for t in _tasks if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task": task}

@router.post("/tasks", status_code=201)
async def create_task(body: TaskCreate):
    task = {"id": str(len(_tasks) + 1), "title": body.title, "completed": False, "created_at": datetime.now().isoformat()}
    _tasks.append(task)
    return {"task": task}

@router.put("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate):
    task = next((t for t in _tasks if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if body.title is not None: task["title"] = body.title
    if body.completed is not None: task["completed"] = body.completed
    return {"task": task}

@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str):
    idx = next((i for i, t in enumerate(_tasks) if t["id"] == task_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Task not found")
    _tasks.pop(idx)`,
    'app/models.py': `from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TaskBase(BaseModel):
    title: str

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None

class Task(TaskBase):
    id: str
    completed: bool = False
    created_at: str = datetime.now().isoformat()

    class Config:
        from_attributes = True`,
    '.env.example': `DATABASE_URL=sqlite:///./app.db\nHOST=0.0.0.0\nPORT=8000`,
  },
};

export const TEMPLATES: Template[] = [
  NEXTJS_TAILWIND,
  REACT_VITE,
  EXPRESS_API,
  FASTAPI,
];
