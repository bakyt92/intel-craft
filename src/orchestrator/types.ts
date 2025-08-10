export type TaskStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';

export interface TaskNode {
  id: string;
  label: string;
  status: TaskStatus;
  detail?: string;
}

export interface ResearchInput {
  company: string;
  industry: string;
  clients: string[];
  windowDays: number;
  region?: string;
}

export interface ResearchOutput {
  nodes: TaskNode[];
  itemsBySegment: Record<string, any[]>;
  executiveBrief?: string;
}
