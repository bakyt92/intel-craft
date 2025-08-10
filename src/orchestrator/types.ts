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

export interface GeneratedQueries {
  companyQueries: string[];
  industryQueries: string[];
  clientQueries: string[];
  totalQueries: number;
}

export interface AIResearchSummary {
  originalCompany: string;
  discoveredAliases: string[];
  originalIndustry: string;
  discoveredIndustries: string[];
  originalClients: string[];
  validatedClients: string[];
  generatedQueries: GeneratedQueries;
}

export interface ResearchOutput {
  nodes: TaskNode[];
  itemsBySegment: Record<string, any[]>;
  executiveBrief?: string;
  aiResearch?: AIResearchSummary;
}
