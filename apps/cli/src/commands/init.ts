import inquirer from 'inquirer';
import chalk from 'chalk';
import type { CommandResult, ProviderType, ModelInfo } from '@codethon/shared-types';
import { AVAILABLE_MODELS, TECH_STACK_CATALOG } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { HealthScoreCalculator } from '../cil/health-score';
import { logger, labelValue } from '../utils';
import { getProjectsDir, setLLMConfig } from '../utils/config';
import { listProjects } from '../memory/project-store';

function formatModelEntry(m: ModelInfo): string {
  const ctxLabel = m.contextWindow >= 1000000
    ? `${(m.contextWindow / 1000000).toFixed(1)}M`
    : m.contextWindow >= 1000
      ? `${(m.contextWindow / 1000).toFixed(0)}K`
      : `${m.contextWindow}`;
  const badge = m.recommended ? chalk.bgGreen.black(' BEST ') : '';
  const tag = m.provider === 'nvidia' ? chalk.magenta('[NV]') : chalk.cyan('[OA]');
  const price = m.pricing === 'Free' ? chalk.green('Free') : chalk.dim(m.pricing);
  return `${chalk.bold(m.name)}  ${chalk.dim(`${ctxLabel} ctx`)}  ${price} ${badge} ${tag}`;
}

export async function initCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Project Initialization');

  const state = new StateManager();
  const health = new HealthScoreCalculator();

  // Check for existing projects
  const existing = listProjects();
  if (existing.length > 0) {
    logger.info(`${existing.length} project(s) found.`);

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        pageSize: 12,
        choices: [
          { name: '  Create new project', value: 'new' },
          { name: '  Select existing project', value: 'select' },
          new inquirer.Separator(),
          ...existing.map((p) => ({
            name: `  ${p.name}`,
            value: p.id,
          })),
        ],
      },
    ]);

    if (action !== 'new' && action !== 'select') {
      const { setCurrentProjectId } = require('../utils/config');
      setCurrentProjectId(action);
      const project = state.getProject();
      if (project) {
        logger.section(`Project Loaded: ${project.name || project.idea}`);
        labelValue('Idea', project.idea);
        labelValue('Stack', project.stack);
        labelValue('Timeline', project.timeline);
        labelValue('Phase', project.sprintPhase);
        const score = health.calculate();
        logger.info('');
        logger.bullet(`Health Score: ${score.overall}/100`);
        return { success: true, message: `Loaded project: ${project.idea}` };
      }
    }

    if (action === 'select') {
      const { projectId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'projectId',
          message: 'Select a project:',
          pageSize: 12,
          choices: existing.map((p) => ({
            name: `  ${p.name}`,
            value: p.id,
          })),
        },
      ]);
      const { setCurrentProjectId } = require('../utils/config');
      setCurrentProjectId(projectId);
      const project = state.getProject();
      if (project) {
        logger.section(`Project Loaded: ${project.name || project.idea}`);
        labelValue('Idea', project.idea);
        labelValue('Stack', project.stack);
        labelValue('Timeline', project.timeline);
        labelValue('Phase', project.sprintPhase);
        const score = health.calculate();
        logger.info('');
        logger.bullet(`Health Score: ${score.overall}/100`);
        return { success: true, message: `Loaded project: ${project.idea}` };
      }
    }
  }

  // ── 1. Product Idea ──
  logger.info('Define your hackathon project.');
  logger.muted('The more specific, the better the outputs will be.');
  logger.divider();

  const { idea } = await inquirer.prompt([
    {
      type: 'input',
      name: 'idea',
      message: 'What is your product idea?',
      validate: (input: string) => input.length > 0 ? true : 'Please describe your idea',
    },
  ]);

  // ── 2. Categorized Tech Stack ──
  logger.info('Select your tech stack. Space to toggle, arrows to navigate.');
  logger.divider();

  const allStackChoices = TECH_STACK_CATALOG.flatMap((cat) => [
    new inquirer.Separator(chalk.cyan(`── ${cat.category} ──`)),
    ...cat.items.map((item) => ({ name: `  ${item}`, value: item, checked: false })),
  ]);

  const { stackSelection } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'stackSelection',
      message: 'Technologies:',
      pageSize: 20,
      loop: false,
      choices: allStackChoices,
    },
  ]);

  const userStack = stackSelection.length > 0 ? stackSelection.join(' + ') : 'Next.js + TailwindCSS + Supabase';

  // ── 3. Timeline ──
  const { timeline } = await inquirer.prompt([
    {
      type: 'list',
      name: 'timeline',
      message: 'What is your timeline?',
      choices: [
        { name: '  24 hours (sprint)', value: '24h' },
        { name: '  48 hours (weekend)', value: '48h' },
        { name: '  72 hours (long weekend)', value: '72h' },
        { name: '  1 week', value: '1w' },
      ],
    },
  ]);

  // ── 4. Experience Level ──
  const { experienceLevel } = await inquirer.prompt([
    {
      type: 'list',
      name: 'experienceLevel',
      message: 'Your experience level:',
      choices: [
        { name: '  Beginner \u2014 learning as I build', value: 'beginner' },
        { name: '  Intermediate \u2014 have built before', value: 'intermediate' },
        { name: '  Advanced \u2014 experienced developer', value: 'advanced' },
      ],
    },
  ]);

  // ── 5. AI Model Selection ──
  logger.info('Choose your AI model.');
  logger.divider();

  const openaiModels = AVAILABLE_MODELS.filter((m) => m.provider === 'openai');
  const nvidiaModels = AVAILABLE_MODELS.filter((m) => m.provider === 'nvidia');

  const modelChoices = [
    new inquirer.Separator(chalk.magenta('── NVIDIA (Free, no API key needed) ──')),
    ...nvidiaModels.map((m) => ({
      name: `  ${formatModelEntry(m)}`,
      value: m.id,
    })),
    new inquirer.Separator(chalk.cyan('── OpenAI ──')),
    ...openaiModels.map((m) => ({
      name: `  ${formatModelEntry(m)}`,
      value: m.id,
    })),
  ];

  const { selectedModel } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedModel',
      message: 'Select a model:',
      pageSize: 18,
      choices: modelChoices,
    },
  ]);

  const allModels = [...nvidiaModels, ...openaiModels];
  const selectedModelInfo = allModels.find((m) => m.id === selectedModel);
  const provider: ProviderType = selectedModelInfo?.provider || 'nvidia';
  const modelId = selectedModel;

  // ── Init Project ──
  state.initProject(idea, userStack, timeline, experienceLevel, modelId);

  setLLMConfig({
    provider,
    model: modelId,
    temperature: 0.3,
    maxTokens: selectedModelInfo?.maxOutput || 4096,
  });

  logger.section('Project Initialized');

  if (selectedModelInfo) {
    const ctxLabel = selectedModelInfo.contextWindow >= 1000000
      ? `${(selectedModelInfo.contextWindow / 1000000).toFixed(1)}M`
      : selectedModelInfo.contextWindow >= 1000
        ? `${(selectedModelInfo.contextWindow / 1000).toFixed(0)}K`
        : `${selectedModelInfo.contextWindow}`;
    const tag = selectedModelInfo.provider === 'nvidia' ? chalk.magenta('NVIDIA') : selectedModelInfo.provider === 'openai' ? chalk.cyan('OpenAI') : chalk.dim('Dev');
    logger.labelValue('Model', `${chalk.bold(selectedModelInfo.name)}  ${chalk.dim(`${ctxLabel} ctx`)}  ${tag}`);
  }

  logger.labelValue('Stack', userStack);
  logger.labelValue('Timeline', timeline);
  logger.labelValue('Runtime', 'Built-in Executor');

  logger.divider();

  const score = health.calculate();
  logger.bullet(`Starting Health Score: ${score.overall}/100`);
  logger.info('');
  logger.highlight('Recommended next steps:');
  logger.info('');
  logger.commandBlock('ct plan --feature "<your feature>"');
  logger.muted('   \u2514\u2500 Generate roadmap + architecture in one command');
  logger.commandBlock('ct scaffold');
  logger.muted('   \u2514\u2500 Generate starter project files');
  logger.commandBlock('ct execute "<goal>"');
  logger.muted('   \u2514\u2500 Start building with the autonomous agent');

  return {
    success: true,
    message: `Project "${idea}" initialized successfully`,
    data: { idea, stack: userStack, timeline },
  };
}
