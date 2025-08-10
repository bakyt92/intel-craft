import { LS_KEYS } from "@/utils/LocalStorageKeys";

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

  static async search(params: { company: string; industry: string; clients: string[]; windowDays: number; region?: string; }): Promise<SearchItem[]> {
    const gl = params.region && params.region.toLowerCase() !== "global" ? params.region.toLowerCase() : undefined;
    const tbs = this.tbsFromWindowDays(params.windowDays);

    const companyQ = `"${params.company}" news`;
    const industryQ = `${params.industry} trends OR news`;
    const clientQs = params.clients.map(c => `"${c}" "${params.company}" OR ${params.industry}`);

    const tasks: Array<Promise<{ seg: SearchItem["segment"]; items: SearchItem[] }>> = [];

    tasks.push(
      this.querySerper(companyQ, { gl, tbs }).then(items => ({ seg: "Company" as const, items }))
    );
    tasks.push(
      this.querySerper(industryQ, { gl, tbs }).then(items => ({ seg: "Industry" as const, items }))
    );
    for (const q of clientQs) {
      tasks.push(this.querySerper(q, { gl, tbs }).then(items => ({ seg: "Client" as const, items })));
    }

    const results = await Promise.all(tasks);
    const out: SearchItem[] = [];
    for (const r of results) {
      for (const it of r.items) {
        out.push({ ...it, segment: r.seg });
      }
    }
    return out;
  }
}
