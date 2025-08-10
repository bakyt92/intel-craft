import { LS_KEYS } from "@/utils/LocalStorageKeys";
import { PerplexityResearchAgent, type CompanyResearch } from "./PerplexityResearchAgent";
import type { GeneratedQueries, AIResearchSummary } from "../orchestrator/types";

export interface SearchItem {
  segment: "Company" | "Industry" | "Client";
  title: string;
  url: string;
  date?: string;
  source?: string;
}

export class SerperSearchAgent {
  private static endpoint = "https://google.serper.dev/news";

  static getApiKey(): string | null {
    return localStorage.getItem(LS_KEYS.serperApiKey);
  }

  private static tbsFromWindowDays(days: number): string | undefined {
    if (!days) return undefined;
    if (days <= 7) return "qdr:w"; // last week
    if (days <= 30) return "qdr:m"; // last month
    if (days <= 365) return "qdr:y"; // last year
    return undefined;
  }

  private static async querySerper(q: string, opts: { gl?: string; hl?: string; tbs?: string; num?: number; }): Promise<SearchItem[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error("Serper API key missing");

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q, gl: opts.gl, hl: opts.hl || "en", tbs: opts.tbs, num: opts.num || 10 })
    });

    if (!res.ok) throw new Error(`Serper search failed: ${res.status}`);
    const data = await res.json();
    const news: any[] = data.news || [];
    return news.map((n) => ({
      segment: "Company",
      title: n.title,
      url: n.link,
      date: n.date,
      source: n.source,
    }));
  }

  static async search(params: { company: string; industry: string; clients: string[]; windowDays: number; region?: string; }): Promise<{ items: SearchItem[]; aiResearch: AIResearchSummary }> {
    const gl = params.region && params.region.toLowerCase() !== "global" ? params.region.toLowerCase() : undefined;
    const tbs = this.tbsFromWindowDays(params.windowDays);

    // Step 1: Use Perplexity AI to enhance search parameters
    console.log('🔍 Researching company with Perplexity AI...');
    let research: CompanyResearch;
    try {
      research = await PerplexityResearchAgent.researchCompany(
        params.company, 
        params.industry, 
        params.clients
      );
    } catch (error) {
      console.warn('Perplexity research failed, using original parameters:', error);
      research = {
        aliases: [params.company],
        industries: [params.industry],
        validatedClients: params.clients
      };
    }

    // Step 2: Generate enhanced search queries using research data
    const companyQueries = research.aliases.map(alias => `"${alias}" news`);
    const industryQueries = research.industries.map(industry => `${industry} trends OR news`);
    const clientQueries = research.validatedClients.map(client => 
      research.aliases.map(alias => `"${client}" "${alias}" OR ${research.industries.join(' OR ')}`).join(' OR ')
    );

    // Create queries summary for frontend
    const generatedQueries: GeneratedQueries = {
      companyQueries,
      industryQueries,
      clientQueries,
      totalQueries: companyQueries.length + industryQueries.length + clientQueries.length
    };

    // Create AI research summary for frontend
    const aiResearch: AIResearchSummary = {
      originalCompany: params.company,
      discoveredAliases: research.aliases,
      originalIndustry: params.industry,
      discoveredIndustries: research.industries,
      originalClients: params.clients,
      validatedClients: research.validatedClients,
      generatedQueries
    };

    console.log('📊 Enhanced search parameters:', {
      companyAliases: research.aliases.length,
      industries: research.industries.length,
      validatedClients: research.validatedClients.length,
      totalQueries: generatedQueries.totalQueries
    });

    // Step 3: Execute parallel searches with enhanced queries
    const tasks: Array<Promise<{ seg: SearchItem["segment"]; items: SearchItem[] }>> = [];

    // Company searches (using all aliases)
    for (const query of companyQueries) {
      tasks.push(
        this.querySerper(query, { gl, tbs }).then(items => ({ seg: "Company" as const, items }))
      );
    }

    // Industry searches (using discovered industries)
    for (const query of industryQueries) {
      tasks.push(
        this.querySerper(query, { gl, tbs }).then(items => ({ seg: "Industry" as const, items }))
      );
    }

    // Client searches (using validated clients with company aliases)
    for (const query of clientQueries) {
      tasks.push(
        this.querySerper(query, { gl, tbs }).then(items => ({ seg: "Client" as const, items }))
      );
    }

    const results = await Promise.all(tasks);

    // Step 4: Combine and deduplicate results
    const allItems: SearchItem[] = [];
    const seenUrls = new Set<string>();

    for (const result of results) {
      for (const item of result.items) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          allItems.push({
            ...item,
            segment: result.seg
          });
        }
      }
    }

    console.log(`✅ Found ${allItems.length} unique items across all segments`);
    return { items: allItems, aiResearch };
  }
}
