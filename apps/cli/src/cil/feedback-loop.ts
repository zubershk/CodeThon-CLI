import type { FeedbackEntry } from '@codethon/shared-types';
import { StateManager } from './state-manager';

export class FeedbackLoop {
  private state: StateManager;

  constructor() {
    this.state = new StateManager();
  }

  recordFeedback(command: string, rating: 1 | 2 | 3 | 4 | 5, comment?: string): void {
    const project = this.state.getProjectOrThrow();
    const entry: FeedbackEntry = {
      command,
      rating,
      comment,
      timestamp: new Date().toISOString(),
    };
    project.feedback.push(entry);
    this.state.updateProject({ feedback: project.feedback });
  }

  getAverageRating(command?: string): number {
    const project = this.state.getProject();
    if (!project || project.feedback.length === 0) return 0;

    const filtered = command
      ? project.feedback.filter((f) => f.command === command)
      : project.feedback;

    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((a, f) => a + f.rating, 0);
    return Math.round((sum / filtered.length) * 10) / 10;
  }

  getWeakCommands(): { command: string; avgRating: number }[] {
    const project = this.state.getProject();
    if (!project) return [];

    const commandRatings = new Map<string, number[]>();
    for (const f of project.feedback) {
      const ratings = commandRatings.get(f.command) || [];
      ratings.push(f.rating);
      commandRatings.set(f.command, ratings);
    }

    return Array.from(commandRatings.entries())
      .map(([cmd, ratings]) => ({
        command: cmd,
        avgRating: Math.round((ratings.reduce((a, r) => a + r, 0) / ratings.length) * 10) / 10,
      }))
      .filter((r) => r.avgRating < 3)
      .sort((a, b) => a.avgRating - b.avgRating);
  }

  getStrengths(): { command: string; avgRating: number }[] {
    const project = this.state.getProject();
    if (!project) return [];

    const commandRatings = new Map<string, number[]>();
    for (const f of project.feedback) {
      const ratings = commandRatings.get(f.command) || [];
      ratings.push(f.rating);
      commandRatings.set(f.command, ratings);
    }

    return Array.from(commandRatings.entries())
      .map(([cmd, ratings]) => ({
        command: cmd,
        avgRating: Math.round((ratings.reduce((a, r) => a + r, 0) / ratings.length) * 10) / 10,
      }))
      .filter((r) => r.avgRating >= 4)
      .sort((a, b) => b.avgRating - a.avgRating);
  }

  getTotalFeedbackCount(): number {
    const project = this.state.getProject();
    return project?.feedback.length || 0;
  }
}
