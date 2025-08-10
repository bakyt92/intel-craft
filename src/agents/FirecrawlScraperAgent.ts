import { FirecrawlService } from "@/utils/FirecrawlService";

export interface ScrapedDoc {
  url: string;
  content?: string;
  title?: string;
  error?: string;
}

export class FirecrawlScraperAgent {
  static async scrapeAll(urls: string[]): Promise<ScrapedDoc[]> {
    const tasks = urls.map(async (url) => {
      const r = await FirecrawlService.crawlSingle(url);
      if (!r.success) return { url, error: r.error } as ScrapedDoc;
      const doc = r.data?.data?.[0] || {};
      return {
        url,
        title: doc?.metadata?.title || undefined,
        content: doc?.markdown || doc?.html || '',
      } as ScrapedDoc;
    });
    const results = await Promise.allSettled(tasks);
    return results.map((res, i) =>
      res.status === 'fulfilled' ? res.value : { url: urls[i], error: (res.reason as Error)?.message }
    );
  }
}
