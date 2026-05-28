// ─── Project Core ────────────────────────────────────────────────
export interface ProjectState {
  id: string;
  name: string;
  idea: string;
  stack: string;
  timeline: string;
  model?: string;
  totalTokensUsed?: number;
  experienceLevel: ExperienceLevel;
  sprintPhase: SprintPhase;
  roadmap: Roadmap | null;
  architecture: Architecture | null;
  debugSessions: DebugSession[];
  blockers: Blocker[];
  outputs: string[];
  events: ProjectEvent[];
  feedback: FeedbackEntry[];
  deploymentStatus: DeploymentStatus;
  healthScore: HealthScore;
  healthHistory: HealthSnapshot[];
  memoryGraph: MemoryNode[];
  executionLog: ExecutionRecord[];
  launchReadiness: LaunchReadiness;
  timePressure: number;
  createdAt: string;
  updatedAt: string;
}

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type SprintPhase = 'ideation' | 'planning' | 'building' | 'debugging' | 'deploying' | 'launching' | 'done';

// ─── Events (Event Sourcing) ─────────────────────────────────────
export interface ProjectEvent {
  type: EventType;
  timestamp: string;
  description: string;
  data?: Record<string, unknown>;
}

export type EventType =
  | 'project_created'
  | 'roadmap_generated'
  | 'architecture_generated'
  | 'scaffold_created'
  | 'debug_session'
  | 'blocker_added'
  | 'blocker_resolved'
  | 'deployment_configured'
  | 'readme_generated'
  | 'launch_assets_generated'
  | 'startup_analysis'
  | 'sprint_phase_changed'
  | 'health_recalculated'
  | 'feedback_recorded'
  | 'command_executed'
  | 'agent_zero_connected';

// ─── Feedback ────────────────────────────────────────────────────
export interface FeedbackEntry {
  command: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  timestamp: string;
}

// ─── Roadmap ─────────────────────────────────────────────────────
export interface Roadmap {
  milestones: Milestone[];
  overview: string;
  generatedAt: string;
}

export interface Milestone {
  title: string;
  tasks: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'done';
  estimatedHours?: number;
}

// ─── Architecture ────────────────────────────────────────────────
export interface Architecture {
  stack: string[];
  backendStructure?: string;
  frontendStructure?: string;
  databaseSchema?: string;
  apiRoutes?: string;
  infraRecommendations?: string;
  generatedAt: string;
}

// ─── Debug ───────────────────────────────────────────────────────
export interface DebugSession {
  timestamp: string;
  input: string;
  rootCause: string;
  fixes: string[];
  recoverySteps: string[];
  commands: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

// ─── Blockers ────────────────────────────────────────────────────
export interface Blocker {
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: BlockerCategory;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolution?: string;
}

export type BlockerCategory = 'setup' | 'code' | 'dependency' | 'deployment' | 'auth' | 'database' | 'unknown';

// ─── Deployment ──────────────────────────────────────────────────
export interface DeploymentRecord {
  platform: string;
  url: string;
  timestamp: string;
}

export interface DeploymentStatus {
  platform: string | null;
  url: string | null;
  envVarsSet: boolean;
  buildPassing: boolean | null;
  lastChecked: string | null;
  history?: DeploymentRecord[];
}

// ─── Health ──────────────────────────────────────────────────────
export interface HealthScore {
  overall: number;
  mvpCompletion: number;
  deploymentReadiness: number;
  documentationCompleteness: number;
  blockerSeverity: number;
  launchReadiness: number;
  velocity: number;
  timePressure: number;
}

export interface HealthSnapshot {
  timestamp: string;
  score: HealthScore;
}

// ─── Memory Graph ────────────────────────────────────────────────
export interface MemoryNode {
  id: string;
  type: MemoryNodeType;
  content: string;
  tags: string[];
  timestamp: string;
  connections: MemoryConnection[];
}

export type MemoryNodeType = 'command' | 'blocker' | 'fix' | 'output' | 'insight' | 'decision';

export interface MemoryConnection {
  targetId: string;
  relationship: 'caused' | 'fixed' | 'generated' | 'related_to' | 'follows';
}

// ─── Execution ───────────────────────────────────────────────────
export interface ExecutionRecord {
  command: string;
  timestamp: string;
  success: boolean;
  duration: number;
  output: string;
  suggestedBy: string | null;
}

// ─── Launch Readiness ────────────────────────────────────────────
export interface LaunchReadiness {
  overall: number;
  checklist: LaunchChecklistItem[];
}

export interface LaunchChecklistItem {
  key: string;
  label: string;
  done: boolean;
  required: boolean;
}

// ─── Workflow ────────────────────────────────────────────────────
export interface WorkflowStep {
  command: string;
  label: string;
  description: string;
  agent: string;
  status: 'pending' | 'current' | 'done' | 'skipped';
}

export interface WorkflowSuggestion {
  currentCommand: string;
  nextSuggestedCommands: string[];
  rationale: string;
}

// ─── Sprint ──────────────────────────────────────────────────────
export interface SprintInfo {
  phase: SprintPhase;
  totalHours: number;
  elapsedHours: number;
  remainingHours: number;
  percentComplete: number;
  pressure: 'low' | 'medium' | 'high' | 'critical';
}

// ─── Agent IO ────────────────────────────────────────────────────
export type CommandResult = {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
};

export interface AgentInput {
  projectState: ProjectState;
  userInput?: string;
  command: string;
}

export interface AgentOutput {
  summary: string;
  details: string;
  data?: Record<string, unknown>;
}

// ─── Models / LLM ────────────────────────────────────────────────
export type ProviderType = 'openai' | 'nvidia';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow: number;
  maxOutput: number;
  pricing: string;
  recommended: boolean;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // NVIDIA (Free, no API key needed)
  { id: 'deepseek-ai/deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'nvidia', contextWindow: 131072, maxOutput: 8192, pricing: 'Free', recommended: true },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1', name: 'Nemotron Super 49B', provider: 'nvidia', contextWindow: 128000, maxOutput: 8192, pricing: 'Free', recommended: false },
  { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'nvidia', contextWindow: 128000, maxOutput: 4096, pricing: 'Free', recommended: false },
  // OpenAI (requires OPENAI_API_KEY)
  { id: 'gpt-5.5', name: 'GPT-5.5', provider: 'openai', contextWindow: 128000, maxOutput: 16384, pricing: 'Check OpenAI pricing', recommended: true },
  { id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro', provider: 'openai', contextWindow: 128000, maxOutput: 16384, pricing: 'Check OpenAI pricing', recommended: false },
  { id: 'gpt-5.4', name: 'GPT-5.4', provider: 'openai', contextWindow: 128000, maxOutput: 16384, pricing: 'Check OpenAI pricing', recommended: false },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', provider: 'openai', contextWindow: 128000, maxOutput: 16384, pricing: 'Check OpenAI pricing', recommended: false },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai', contextWindow: 128000, maxOutput: 16384, pricing: 'Check OpenAI pricing', recommended: false },
  { id: 'gpt-5', name: 'GPT-5', provider: 'openai', contextWindow: 128000, maxOutput: 16384, pricing: 'Check OpenAI pricing', recommended: false },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', contextWindow: 128000, maxOutput: 16384, pricing: 'Check OpenAI pricing', recommended: false },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000, maxOutput: 16384, pricing: '$2.50/$10.00', recommended: false },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000, maxOutput: 16384, pricing: '$0.15/$0.60', recommended: false },
  { id: 'o3', name: 'o3', provider: 'openai', contextWindow: 200000, maxOutput: 100000, pricing: 'Check OpenAI pricing', recommended: false },
  { id: 'o4-mini', name: 'o4 Mini', provider: 'openai', contextWindow: 200000, maxOutput: 100000, pricing: 'Check OpenAI pricing', recommended: false },
];

export interface LLMConfig {
  provider: ProviderType;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// ─── Tech Stack Catalog ──────────────────────────────────────────
export interface StackCategory {
  category: string;
  items: string[];
}

export const TECH_STACK_CATALOG: StackCategory[] = [
  {
    category: 'Frontend Frameworks',
    items: ['Next.js', 'React', 'Vue.js', 'Nuxt.js', 'Svelte', 'SvelteKit', 'Solid.js', 'Astro', 'Remix', 'Gatsby', 'Angular', 'Preact', 'Qwik', 'Alpine.js'],
  },
  {
    category: 'CSS & UI Libraries',
    items: ['TailwindCSS', 'shadcn/ui', 'Material UI', 'Chakra UI', 'Radix UI', 'Ant Design', 'DaisyUI', 'Bootstrap', 'Styled Components', 'Emotion', 'Framer Motion', 'GSAP', 'Three.js'],
  },
  {
    category: 'Backend Frameworks',
    items: ['Express.js', 'Fastify', 'NestJS', 'Hono', 'FastAPI', 'Flask', 'Django', 'Spring Boot', 'Gin', 'Echo', 'Actix Web', 'Rocket', 'Koa', 'Hapi'],
  },
  {
    category: 'Databases & ORMs',
    items: ['PostgreSQL', 'Supabase', 'Neon', 'MongoDB', 'Prisma', 'Drizzle ORM', 'TypeORM', 'SQLite', 'MySQL', 'PlanetScale', 'Redis', 'Upstash', 'Firebase Firestore', 'CockroachDB', 'Turso'],
  },
  {
    category: 'Auth & BaaS',
    items: ['Supabase Auth', 'Clerk', 'NextAuth.js', 'Auth0', 'Firebase Auth', 'Lucia Auth', 'Kinde', 'Logto'],
  },
  {
    category: 'Storage & Media',
    items: ['Supabase Storage', 'Uploadthing', 'Cloudinary', 'AWS S3', 'MinIO', 'DigitalOcean Spaces'],
  },
  {
    category: 'Deployment & Hosting',
    items: ['Vercel', 'Netlify', 'Railway', 'Render', 'Fly.io', 'Cloudflare Pages', 'AWS Amplify', 'Firebase Hosting', 'GitHub Pages'],
  },
  {
    category: 'APIs & Data Fetching',
    items: ['tRPC', 'GraphQL', 'Apollo', 'Relay', 'TanStack Query', 'SWR', 'Axios', 'OpenAPI', 'WebSockets', 'Server-Sent Events'],
  },
  {
    category: 'Testing',
    items: ['Vitest', 'Jest', 'Playwright', 'Cypress', 'Testing Library', 'MSW'],
  },
  {
    category: 'Dev Tools & Monorepo',
    items: ['pnpm', 'Turborepo', 'Nx', 'nx', 'ESLint', 'Prettier', 'Biome', 'Husky', 'lint-staged'],
  },
  {
    category: 'AI & ML',
    items: ['OpenAI API', 'NVIDIA NIM', 'LangChain', 'Vercel AI SDK', 'Hugging Face', 'LlamaIndex', 'TensorFlow.js'],
  },
];