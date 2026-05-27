import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { getLLMConfig, getCurrentProjectId } from '../utils/config';
import { createProvider } from '@codethon/llm-client';
import { startAgent, succeedAgent, failAgent } from '../utils/agent-feed';
import { logger } from '../utils';
import { renderAgentOutput } from '../utils/render';
import chalk from 'chalk';

export async function summarizeCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Summary');

  const state = new StateManager();
  const project = state.getProject();
  const llm = getLLMConfig();

  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  startAgent('PM', 'Generating project summary...');

  try {
    const blockers = project.blockers?.filter(b => !b.resolved) || [];
    const events = project.events?.slice(-10) || [];
    const debugCount = project.debugSessions?.length || 0;
    const resolvedDebug = project.debugSessions?.filter(d => d.resolved).length || 0;
    const outputs = project.outputs?.length || 0;
    const hs = project.healthScore;

    const context = {
      name: project.name,
      idea: project.idea,
      stack: project.stack,
      phase: project.sprintPhase,
      timeline: project.timeline,
      experience: project.experienceLevel,
      milestones: project.roadmap?.milestones?.length || 0,
      architecture: project.architecture ? 'defined' : 'not defined',
      blockers: blockers.length,
      debugSessions: `${resolvedDebug}/${debugCount} resolved`,
      outputsGenerated: outputs,
      health: hs ? {
        overall: hs.overall,
        mvp: hs.mvpCompletion,
        deploy: hs.deploymentReadiness,
        docs: hs.documentationCompleteness,
        blockers: hs.blockerSeverity,
        launch: hs.launchReadiness,
        velocity: hs.velocity,
      } : null,
      recentEvents: events.map((e: any) => `${e.type}: ${e.description}`),
      deployment: project.deploymentStatus?.platform || 'not configured',
      model: llm.model,
    };

    const config = getLLMConfig();
    const provider = createProvider(config);

    const response = await provider.generate({
      messages: [
        {
          role: 'system',
          content: `You are a technical PM summarizing project status. Be concise and actionable.

Given the project state, generate a structured summary with:
1. **Project Status** — phase, health, what's been done
2. **Current Blockers** — what's blocking progress (if any)
3. **Next Priorities** — the top 3 things to do next
4. **Readiness Assessment** — is this on track to ship?
5. **Recommended Next Command** — what to run next in the CLI

Use markdown. Be direct — no fluff. Under 300 words.`,
        },
        {
          role: 'user',
          content: JSON.stringify(context, null, 2),
        },
      ],
      temperature: 0.2,
      maxTokens: 1500,
    });

    succeedAgent('Summary generated');
    console.log('');

    // Also show key metrics inline
    logger.labelValue('Phase', project.sprintPhase || 'N/A');
    logger.labelValue('MVP Completion', hs ? `${hs.mvpCompletion}/100` : 'N/A');
    const blockerStr = blockers.length > 0 ? chalk.redBright(`${blockers.length} active`) : 'None';
    logger.labelValue('Blockers', blockerStr);
    logger.labelValue('Debug Sessions', `${resolvedDebug}/${debugCount} resolved`);
    logger.labelValue('Outputs Generated', `${outputs}`);
    console.log('');

    renderAgentOutput(response.content);
    console.log('');

    return { success: true, message: 'Summary generated', data: { summary: response.content } };
  } catch (error) {
    failAgent(error instanceof Error ? error.message : 'Summary failed');
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Failed to generate summary' };
  }
}
