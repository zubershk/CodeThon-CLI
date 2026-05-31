import fs from 'fs';
import path from 'path';
import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { executeCommand } from '../runtime';
import { createSpinner, logger } from '../utils';
import { ensureDir, writeFile } from '../utils/file-utils';
import { TEMPLATES } from '../templates/templates';
import type { Template } from '../templates/templates';
import { promptSelect } from '../utils/prompt';

export async function scaffoldCommand(targetDir?: string, templateNameArg?: string): Promise<CommandResult> {
  logger.section('CodeThon CLI — Project Scaffold');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `/init` inside ct, or `ct init` from your shell.');
    return { success: false, message: 'No active project' };
  }

  let templateName = templateNameArg;
  if (!templateName) {
    templateName = await promptSelect({
      message: 'Choose a project template:',
      choices: TEMPLATES.map(t => ({ name: `  ${t.name} — ${t.description}`, value: t.name })),
    });
  }

  const template = TEMPLATES.find(t => t.name === templateName)!;
  const dir = targetDir || process.cwd();
  const projectDir = path.join(dir, project.name?.toLowerCase().replace(/\s+/g, '-') || 'codethon-project');

  if (fs.existsSync(projectDir)) {
    logger.warn(`Directory already exists: ${projectDir}`);
    logger.info('If you want to re-scaffold, delete it first:');
    logger.commandBlock(`Remove-Item -Recurse -Force "${projectDir}"`);
    return { success: false, message: 'Project directory already exists' };
  }

  const spinner = createSpinner(`Scaffolding ${template.name}...`);
  spinner.start();

  try {
    for (const [filePath, content] of Object.entries(template.files)) {
      const fullPath = path.join(projectDir, filePath);
      ensureDir(path.dirname(fullPath));
      writeFile(fullPath, content);
      spinner.update(`Creating ${filePath}...`);
    }

    const fileCount = Object.keys(template.files).length;
    spinner.succeed(`Created ${fileCount} files at ${projectDir}`);

    logger.info('');
    logger.info('Installing dependencies...');
    const installResult = executeCommand(template.installCmd, 180000);
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

    state.updateProject({ sprintPhase: 'building' });

    return { success: true, message: `Project scaffolded at ${projectDir}`, data: { path: projectDir, template: template.name } };
  } catch (error) {
    spinner.fail('Failed to scaffold project');
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Failed to scaffold project' };
  }
}
