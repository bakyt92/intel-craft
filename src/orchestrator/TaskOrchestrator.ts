import { SerperSearchAgent } from "@/agents/SerperSearchAgent";
import { SummarizationAgent } from "@/agents/SummarizationAgent";
import { ResearchAPIAgent } from "@/agents/ResearchAPIAgent";
import { SchoolabCache } from "@/utils/supabase";
import type { ResearchInput, ResearchOutput, TaskNode, ResearchResponse } from "./types";

export class TaskOrchestrator {
  private nodes: TaskNode[] = [];
  private update?: (nodes: TaskNode[]) => void;

  constructor(onUpdate?: (nodes: TaskNode[]) => void) {
    this.update = onUpdate;
  }

  private pushNode(partial: Omit<TaskNode, 'status'> & { status?: TaskNode['status'] }) {
    const node: TaskNode = { status: 'idle', ...partial } as TaskNode;
    this.nodes.push(node);
    this.update?.([...this.nodes]);
    return node.id;
  }

  private setStatus(id: string, status: TaskNode['status'], detail?: string) {
    const node = this.nodes.find(n => n.id === id);
    if (!node) return;
    node.status = status;
    node.detail = detail;
    this.update?.([...this.nodes]);
  }

  async run(input: ResearchInput): Promise<ResearchOutput> {
    const out: ResearchOutput = { nodes: [], itemsBySegment: { Company: [], Industry: [], Client: [] }, allResponses: [] };

    const nResolve = this.pushNode({ id: 'resolve', label: 'Resolve entities' });
    const nCache = this.pushNode({ id: 'cache', label: 'Check cached reports' });
    const nResearchAPI = this.pushNode({ id: 'research-api', label: 'External Research API' });
    const nResearch = this.pushNode({ id: 'research', label: 'AI-powered company research' });
    const nSearchIndustry = this.pushNode({ id: 'search-industry', label: 'Industry news search' });
    const nSearchCompany = this.pushNode({ id: 'search-company', label: 'Company news search' });
    const nSearchClients = this.pushNode({ id: 'search-clients', label: 'Client mentions search' });
    
    const nDedupe = this.pushNode({ id: 'dedupe', label: 'Deduplicate & NER' });
    const nSummarize = this.pushNode({ id: 'summarize', label: 'Summarize with citations' });

    out.nodes = this.nodes;

    try {
      this.setStatus(nResolve, 'running');
      
      // Comprehensive input validation
      const validationErrors: string[] = [];
      
      // Validate company
      if (!input.company || typeof input.company !== 'string') {
        validationErrors.push('Company name is required and must be a string');
      } else if (input.company.trim().length === 0) {
        validationErrors.push('Company name cannot be empty');
      } else if (input.company.trim().length < 2) {
        validationErrors.push('Company name must be at least 2 characters');
      }
      
      // Validate industry
      if (!input.industry || typeof input.industry !== 'string') {
        validationErrors.push('Industry is required and must be a string');
      } else if (input.industry.trim().length === 0) {
        validationErrors.push('Industry cannot be empty');
      } else if (input.industry.trim().length < 2) {
        validationErrors.push('Industry must be at least 2 characters');
      }
      
      // Validate clients array
      if (!Array.isArray(input.clients)) {
        validationErrors.push('Clients must be an array');
      } else if (input.clients.length === 0) {
        validationErrors.push('At least one client is required');
      } else {
        const invalidClients = input.clients.filter((client, index) => 
          !client || typeof client !== 'string' || client.trim().length === 0
        );
        if (invalidClients.length > 0) {
          validationErrors.push(`${invalidClients.length} invalid client(s) found - clients must be non-empty strings`);
        }
      }
      
      // Validate windowDays
      if (typeof input.windowDays !== 'number') {
        validationErrors.push('Window days must be a number');
      } else if (!Number.isInteger(input.windowDays)) {
        validationErrors.push('Window days must be an integer');
      } else if (input.windowDays < 1) {
        validationErrors.push('Window days must be at least 1');
      } else if (input.windowDays > 365) {
        validationErrors.push('Window days cannot exceed 365');
      }
      
      // Validate region (optional)
      if (input.region !== undefined && (typeof input.region !== 'string' || input.region.trim().length === 0)) {
        validationErrors.push('Region must be a non-empty string if provided');
      }
      
      // Throw validation errors if any
      if (validationErrors.length > 0) {
        const errorMessage = `Input validation failed:\n${validationErrors.map(err => `- ${err}`).join('\n')}`;
        this.setStatus(nResolve, 'error', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Normalize and clean input after validation
      const company = input.company.trim();
      const industry = input.industry.trim();
      const clients = input.clients.map(c => c.trim()).filter(Boolean);
      const region = input.region?.trim();
      
      this.setStatus(nResolve, 'success', `${company} / ${industry} (${clients.length} clients)${region ? ` in ${region}` : ''}`);

      // Step 1: Get ALL cached reports
      this.setStatus(nCache, 'running', 'Retrieving all cached reports from Supabase...');
      const cachedReports = await SchoolabCache.getAllCachedReports(company);
      
      if (cachedReports.length > 0) {
        this.setStatus(nCache, 'success', `Found ${cachedReports.length} cached reports - using cached data only`);
        
        // Add all cached reports to responses
        for (const cached of cachedReports) {
          out.allResponses.push({
            source: 'cache',
            query: cached.query,
            report: cached.report,
            timestamp: cached.created_at
          });
        }

        // Skip all other research when cached data exists
        this.setStatus(nResearchAPI, 'skipped', 'Using cached data - Research API not needed');
        this.setStatus(nResearch, 'skipped', 'Using cached data - AI research not needed');
        this.setStatus(nSearchIndustry, 'skipped', 'Using cached data');
        this.setStatus(nSearchCompany, 'skipped', 'Using cached data');
        this.setStatus(nSearchClients, 'skipped', 'Using cached data');
        this.setStatus(nDedupe, 'skipped', 'Using cached data');
        this.setStatus(nSummarize, 'skipped', 'Using cached data');

        // Set the most recent cached report as the main executive brief for backward compatibility
        out.executiveBrief = cachedReports[0].report;

        return out;
      } else {
        this.setStatus(nCache, 'success', 'No cached reports found - proceeding with fresh research');
      }

      // Step 2: Run Research API (only if no cached data and if enabled)
      if (input.useResearchAPI !== false) {
        this.setStatus(nResearchAPI, 'running', 'Running External Research API...');
        
        try {
          const researchQuery = ResearchAPIAgent.generateResearchQuery(company, industry, clients);
          const apiResult = await ResearchAPIAgent.startResearch(researchQuery);
          
          if (apiResult.success) {
            this.setStatus(nResearchAPI, 'success', `Research API completed (${apiResult.rounds || 0} rounds)`);
            
            // Check for new reports from Research API
            const newCachedReports = await SchoolabCache.getAllCachedReports(company);
            const newReports = newCachedReports.filter(report => 
              !cachedReports.some(cached => cached.id === report.id)
            );
            
            // Add new Research API reports to responses
            for (const newReport of newReports) {
              out.allResponses.push({
                source: 'research-api',
                query: newReport.query,
                report: newReport.report,
                timestamp: newReport.created_at,
                metadata: { rounds: apiResult.rounds }
              });
            }
          } else {
            this.setStatus(nResearchAPI, 'error', `Research API failed: ${apiResult.message}`);
          }
        } catch (error) {
          this.setStatus(nResearchAPI, 'error', `Research API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        this.setStatus(nResearchAPI, 'skipped', 'Research API disabled by user');
      }

      // Step 3: Run AI Research workflow (only if no cached data)
      this.setStatus(nResearch, 'running', 'Using Perplexity AI to discover company aliases, industries, and validate clients...');
      this.setStatus(nSearchIndustry, 'running');
      this.setStatus(nSearchCompany, 'running');
      this.setStatus(nSearchClients, 'running');

      const searchResult = await SerperSearchAgent.search({ company, industry, clients, windowDays: input.windowDays, region: input.region });
      const items = searchResult.items;
      
      // Store AI research data for frontend display
      out.aiResearch = searchResult.aiResearch;
      
      // Update research status with detailed information
      const researchDetail = `Found ${searchResult.aiResearch.discoveredAliases.length} aliases, ${searchResult.aiResearch.discoveredIndustries.length} industries, ${searchResult.aiResearch.validatedClients.length} clients → Generated ${searchResult.aiResearch.generatedQueries.totalQueries} search queries`;
      this.setStatus(nResearch, 'success', researchDetail);
      
      for (const it of items) {
        if (!out.itemsBySegment[it.segment]) out.itemsBySegment[it.segment] = [];
        out.itemsBySegment[it.segment].push(it);
      }
      this.setStatus(nSearchIndustry, 'success', `${out.itemsBySegment['Industry']?.length || 0} items`);
      this.setStatus(nSearchCompany, 'success', `${out.itemsBySegment['Company']?.length || 0} items`);
      this.setStatus(nSearchClients, 'success', `${out.itemsBySegment['Client']?.length || 0} items`);

      // Dedup (naive by URL)
      this.setStatus(nDedupe, 'running');
      const seen = new Set<string>();
      for (const seg of Object.keys(out.itemsBySegment)) {
        // @ts-ignore
        out.itemsBySegment[seg] = out.itemsBySegment[seg].filter((x: any) => {
          if (seen.has(x.url)) return false;
          seen.add(x.url);
          return true;
        });
      }
      this.setStatus(nDedupe, 'success');

      // Summarize
      this.setStatus(nSummarize, 'running');
      out.executiveBrief = await SummarizationAgent.executiveBrief(out.itemsBySegment, company);
      this.setStatus(nSummarize, 'success');

      // Save new report to cache
      if (out.executiveBrief) {
        try {
          await SchoolabCache.saveReport(company, out.executiveBrief);
          console.log(` Saved new report to cache for ${company}`);
        } catch (error) {
          console.warn('Failed to save report to cache:', error);
          // Don't fail the entire process if cache save fails
        }
      }

      return out;
    } catch (e: any) {
      this.setStatus('summarize', 'error', e?.message || 'Error');
      return out;
    }
  }
}
