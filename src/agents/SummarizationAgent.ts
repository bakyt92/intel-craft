import { LS_KEYS } from "@/utils/LocalStorageKeys";
import { SchoolabCache } from "@/utils/supabase";
import type { SearchItem } from "@/agents/PerplexitySearchAgent";

export class SummarizationAgent {
  private static endpoint = 'https://api.perplexity.ai/chat/completions';

  static getApiKey(): string | null {
    return localStorage.getItem(LS_KEYS.perplexityApiKey);
  }

  static async executiveBrief(segments: Record<string, SearchItem[]>, companyName?: string) {
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

    const system = `You are a world-class business analyst specializing in company research and intelligence. Produce concise, source-backed executive summaries with inline citations like [1], [2]. Focus on actionable insights and key developments.`;
    
    // Enhanced prompt with company focus
    const companyFocus = companyName ? `focusing specifically on ${companyName}` : 'focusing on the primary company';
    const user = `Create an executive brief (6-10 bullets) ${companyFocus} based on the following research data grouped by segments (Company, Industry, Client). 

Key requirements:
- Lead with the most important developments about ${companyName || 'the company'}
- Include specific dates and financial figures when available
- Highlight strategic moves, partnerships, market position changes
- Note any client relationships or industry trends that impact the company
- Keep bullets crisp and actionable for executive decision-making
- Include inline citations [1], [2], etc.
- End with a Sources section mapping [n] to URLs

Research Data: ${serialize}`;

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
      payloadSize: payloadSizeKB,
      companyFocus: companyName || 'generic'
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
      const executiveBrief = data.choices?.[0]?.message?.content as string;
      
      // Save the executive brief to Supabase cache
      if (executiveBrief && companyName) {
        try {
          console.log(` Saving executive brief to Supabase for ${companyName}...`);
          await SchoolabCache.saveReport(companyName, executiveBrief);
          console.log(` Successfully saved executive brief to cache for ${companyName}`);
        } catch (error) {
          console.warn(` Failed to save executive brief to cache for ${companyName}:`, error);
          // Don't fail the entire process if cache save fails
        }
      }
      
      return executiveBrief;
    } catch (error) {
      console.error('Perplexity request failed:', error);
      throw error;
    }
  }
}
