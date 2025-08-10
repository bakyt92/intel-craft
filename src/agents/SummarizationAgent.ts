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
    
    // Check payload size to avoid 400 errors
    const payloadSizeKB = new Blob([serialize]).size / 1024;
    console.log(`Payload size: ${payloadSizeKB.toFixed(2)} KB`);
    
    if (payloadSizeKB > 100) {
      console.warn('Large payload detected, truncating data...');
      // Truncate each segment to max 5 items to reduce payload size
      const truncatedSegments: Record<string, SearchItem[]> = {};
      for (const [key, items] of Object.entries(segments)) {
        truncatedSegments[key] = items.slice(0, 5);
      }
      const serialize = JSON.stringify(truncatedSegments);
    }

    const system = 'You are a world-class analyst. Produce concise, source-backed summaries with inline citations like [1], [2].';
    const user = `Create an executive brief (6-10 bullets) based on the following items grouped by segments. Keep bullets crisp with dates. Include a Sources section mapping [n] to URLs. Data: ${serialize}`;

    // Use official Perplexity API format
    const payload = {
      model: 'sonar-pro',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    };

    console.log('Perplexity request:', { 
      model: payload.model, 
      messageCount: payload.messages.length,
      payloadSize: payloadSizeKB 
    });

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Perplexity API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Perplexity summarize failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content as string;
    } catch (error) {
      console.error('Perplexity request failed:', error);
      throw error;
    }
  }
}
