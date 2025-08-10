import { LS_KEYS } from "@/utils/LocalStorageKeys";
import type { SearchItem } from "@/agents/PerplexitySearchAgent";

export class SummarizationAgent {
  private static endpoint = 'https://api.perplexity.ai/chat/completions';

  static getApiKey(): string | null {
    return localStorage.getItem(LS_KEYS.perplexityApiKey);
  }

  static async executiveBrief(segments: Record<string, SearchItem[]>) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Perplexity API key missing');

    const serialize = JSON.stringify(segments);

    const system = 'You are a world-class analyst. Produce concise, source-backed summaries with inline citations like [1], [2].';
    const user = `Create an executive brief (6-10 bullets) based on the following items grouped by segments. Keep bullets crisp with dates. Include a Sources section mapping [n] to URLs. Data: ${serialize}`;

    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.3,
        max_tokens: 1200,
      })
    });

    if (!res.ok) throw new Error(`Perplexity summarize failed: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content as string;
  }
}
