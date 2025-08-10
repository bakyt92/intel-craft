import { PerplexitySearchAgent } from "@/agents/PerplexitySearchAgent";
import { FirecrawlScraperAgent } from "@/agents/FirecrawlScraperAgent";
import { SummarizationAgent } from "@/agents/SummarizationAgent";
import type { ResearchInput, ResearchOutput, TaskNode } from "./types";

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
    const out: ResearchOutput = { nodes: [], itemsBySegment: { Company: [], Industry: [], Client: [] } };

    const nResolve = this.pushNode({ id: 'resolve', label: 'Resolve entities' });
    const nSearchIndustry = this.pushNode({ id: 'search-industry', label: 'Industry news search' });
    const nSearchCompany = this.pushNode({ id: 'search-company', label: 'Company news search' });
    const nSearchClients = this.pushNode({ id: 'search-clients', label: 'Client mentions search' });
    const nScrape = this.pushNode({ id: 'scrape', label: 'Compliant scraping' });
    const nDedupe = this.pushNode({ id: 'dedupe', label: 'Deduplicate & NER' });
    const nSummarize = this.pushNode({ id: 'summarize', label: 'Summarize with citations' });

    out.nodes = this.nodes;

    try {
      this.setStatus(nResolve, 'running');
      // Basic normalization only for MVP
      const company = input.company.trim();
      const industry = input.industry.trim();
      const clients = input.clients.map(c => c.trim()).filter(Boolean);
      this.setStatus(nResolve, 'success', `${company} / ${industry} (${clients.length} clients)`);

      // Parallel searches
      this.setStatus(nSearchIndustry, 'running');
      this.setStatus(nSearchCompany, 'running');
      this.setStatus(nSearchClients, 'running');

      const searchPromise = PerplexitySearchAgent.search({ company, industry, clients, windowDays: input.windowDays, region: input.region });

      const items = await searchPromise;
      for (const it of items) {
        if (!out.itemsBySegment[it.segment]) out.itemsBySegment[it.segment] = [];
        out.itemsBySegment[it.segment].push(it);
      }
      this.setStatus(nSearchIndustry, 'success', `${out.itemsBySegment['Industry']?.length || 0} items`);
      this.setStatus(nSearchCompany, 'success', `${out.itemsBySegment['Company']?.length || 0} items`);
      this.setStatus(nSearchClients, 'success', `${out.itemsBySegment['Client']?.length || 0} items`);

      // Scrape sources (allowlist: use returned URLs)
      this.setStatus(nScrape, 'running');
      const urls = items.map(i => i.url).filter(Boolean);
      const scraped = await FirecrawlScraperAgent.scrapeAll(urls);
      const hasErrors = scraped.some(s => s.error);
      this.setStatus(nScrape, hasErrors ? 'skipped' : 'success', `${scraped.length} pages`);

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
      out.executiveBrief = await SummarizationAgent.executiveBrief(out.itemsBySegment);
      this.setStatus(nSummarize, 'success');

      return out;
    } catch (e: any) {
      this.setStatus('summarize', 'error', e?.message || 'Error');
      return out;
    }
  }
}
