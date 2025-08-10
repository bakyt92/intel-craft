import { LS_KEYS } from "@/utils/LocalStorageKeys";

export interface SearchItem {
  segment: "Company" | "Industry" | "Client";
  title: string;
  url: string;
  date?: string;
  source?: string;
}

export class PerplexitySearchAgent {
  private static endpoint = 'https://api.perplexity.ai/chat/completions';

  static getApiKey(): string | null {
    return localStorage.getItem(LS_KEYS.perplexityApiKey);
  }

  static async search(params: { company: string; industry: string; clients: string[]; windowDays: number; region?: string; }): Promise<SearchItem[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Perplexity API key missing');

    const system = 'Be precise and concise. Return strict JSON. You are a research planner and search agent.';
    const user = `You are part of an automated research workflow. Find recent news items in the last ${params.windowDays} days for:\n- Company: ${params.company}\n- Industry: ${params.industry}\n- Clients: ${params.clients.join(', ') || 'None'}\nRegion focus: ${params.region || 'global'}.\nReturn JSON array under key items with objects: {segment: 'Company'|'Industry'|'Client', title, url, date, source}`;

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-small-online',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.3,
        max_tokens: 800,
        return_images: false,
      })
    });

    if (!res.ok) throw new Error(`Perplexity search failed: ${res.status}`);
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content || '"items": []';
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { items: [] };
      return Array.isArray(parsed) ? parsed : parsed.items || [];
    } catch {
      return [];
    }
  }
}
