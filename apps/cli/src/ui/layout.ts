export interface PaneConfig {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scrollOffset?: number;
  content: string[];
}

export interface LayoutConfig {
  columns: number;
  rows: number;
  panes: PaneConfig[];
}

export class LayoutEngine {
  private width: number;
  private height: number;
  private panes: Map<string, PaneConfig> = new Map();

  constructor() {
    this.width = process.stdout.columns || 80;
    this.height = process.stdout.rows || 24;

    process.stdout.on('resize', () => {
      this.width = process.stdout.columns || 80;
      this.height = process.stdout.rows || 24;
      this.reflow();
    });
  }

  splitVertical(id: string, leftPane: string, rightPane: string, splitRatio = 0.5): void {
    const leftWidth = Math.floor(this.width * splitRatio);
    const rightWidth = this.width - leftWidth - 1;

    this.panes.set(leftPane, {
      id: leftPane,
      x: 0,
      y: 0,
      width: leftWidth,
      height: this.height,
      content: [],
    });

    this.panes.set(rightPane, {
      id: rightPane,
      x: leftWidth + 1,
      y: 0,
      width: rightWidth,
      height: this.height,
      content: [],
    });
  }

  splitHorizontal(id: string, topPane: string, bottomPane: string, splitRatio = 0.6): void {
    const topHeight = Math.floor(this.height * splitRatio);
    const bottomHeight = this.height - topHeight - 1;

    this.panes.set(topPane, {
      id: topPane,
      x: 0,
      y: 0,
      width: this.width,
      height: topHeight,
      content: [],
    });

    this.panes.set(bottomPane, {
      id: bottomPane,
      x: 0,
      y: topHeight + 1,
      width: this.width,
      height: bottomHeight,
      content: [],
    });
  }

  addPane(config: PaneConfig): void {
    this.panes.set(config.id, config);
  }

  getPane(id: string): PaneConfig | undefined {
    return this.panes.get(id);
  }

  setContent(id: string, content: string[]): void {
    const pane = this.panes.get(id);
    if (pane) {
      pane.content = content;
    }
  }

  appendContent(id: string, line: string): void {
    const pane = this.panes.get(id);
    if (pane) {
      pane.content.push(line);
    }
  }

  scroll(id: string, offset: number): void {
    const pane = this.panes.get(id);
    if (pane) {
      pane.scrollOffset = Math.max(0, (pane.scrollOffset || 0) + offset);
    }
  }

  getVisibleLines(id: string): string[] {
    const pane = this.panes.get(id);
    if (!pane) return [];
    const offset = pane.scrollOffset || 0;
    return pane.content.slice(offset, offset + pane.height);
  }

  private reflow(): void {
    for (const [, pane] of this.panes) {
      if (pane.x < this.width && pane.y < this.height) {
        pane.width = Math.min(pane.width, this.width - pane.x);
        pane.height = Math.min(pane.height, this.height - pane.y);
      }
    }
  }

  clear(): void {
    this.panes.clear();
  }
}
