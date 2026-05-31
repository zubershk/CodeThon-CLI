import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { TECH_STACK_CATALOG } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { HealthScoreCalculator } from '../cil/health-score';
import { logger, labelValue } from '../utils';
import { getLLMConfig } from '../utils/config';
import { listProjects } from '../memory/project-store';
import { promptInput, promptMultiSelect, promptSelect } from '../utils/prompt';

export async function initCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Project Initialization');

  const state = new StateManager();
  const health = new HealthScoreCalculator();

  // Check for existing projects
  const existing = listProjects();
  if (existing.length > 0) {
    logger.info(`${existing.length} project(s) found.`);

    const action = await promptSelect({
      message: 'What would you like to do?',
      choices: [
        { name: '  Create new project', value: 'new' },
        { name: '  Select existing project', value: 'select' },
        { separator: '  Existing projects' },
        ...existing.map((p) => ({
          name: `  ${p.name}`,
          value: p.id,
        })),
      ],
    });

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
      const projectId = await promptSelect({
        message: 'Select a project:',
        choices: existing.map((p) => ({
          name: `  ${p.name}`,
          value: p.id,
        })),
      });
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

  const idea = await promptInput({
    message: 'What is your product idea?',
    validate: (input: string) => input.length > 0 ? true : 'Please describe your idea',
  });

  // ── 2. Categorized Tech Stack ──
  logger.info('Select your tech stack. Space to toggle, arrows to navigate.');
  logger.divider();

  const allStackChoices = TECH_STACK_CATALOG.flatMap((cat) => [
    { separator: chalk.hex('#74d7ff')(`── ${cat.category} ──`) },
    ...cat.items.map((item) => ({ name: `  ${item}`, value: item, checked: false })),
  ]);

  const stackSelection = await promptMultiSelect({
    message: 'Technologies:',
    choices: allStackChoices as any,
  });

  const userStack = stackSelection.length > 0 ? stackSelection.join(' + ') : 'Next.js + TailwindCSS + Supabase';

  // ── 3. Timeline ──
  const timeline = await promptSelect({
    message: 'What is your timeline?',
    choices: [
      { name: '  24 hours (sprint)', value: '24h' },
      { name: '  48 hours (weekend)', value: '48h' },
      { name: '  72 hours (long weekend)', value: '72h' },
      { name: '  1 week', value: '1w' },
    ],
  });

  // ── 4. Experience Level ──
  const experienceLevel = await promptSelect({
    message: 'Your experience level:',
    choices: [
      { name: '  Beginner \u2014 learning as I build', value: 'beginner' },
      { name: '  Intermediate \u2014 have built before', value: 'intermediate' },
      { name: '  Advanced \u2014 experienced developer', value: 'advanced' },
    ],
  });

  const llm = getLLMConfig();
  const modelId = llm.model || 'default';

  // ── Init Project ──
  state.initProject(idea, userStack, timeline, experienceLevel, modelId);

  logger.section('Project Initialized');

  logger.labelValue('AI', `${llm.provider} · ${modelId}`);
  logger.labelValue('Stack', userStack);
  logger.labelValue('Timeline', timeline);
  logger.labelValue('Runtime', 'Built-in Executor');

  logger.divider();

  const score = health.calculate();
  logger.bullet(`Starting Health Score: ${score.overall}/100`);
  logger.info('');
  logger.highlight('Recommended next steps:');
  logger.info('');
  logger.commandBlock('/plan "<your feature>"');
  logger.muted('   \u2514\u2500 Generate roadmap + architecture in one command');
  logger.commandBlock('/scaffold');
  logger.muted('   \u2514\u2500 Generate starter project files');
  logger.commandBlock('/execute "<goal>"');
  logger.muted('   \u2514\u2500 Start building with the autonomous agent');

  return {
    success: true,
    message: `Project "${idea}" initialized successfully`,
    data: { idea, stack: userStack, timeline },
  };
}
