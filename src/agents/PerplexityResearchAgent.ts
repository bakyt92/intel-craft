import { LS_KEYS } from "@/utils/LocalStorageKeys";

export interface CompanyResearch {
  aliases: string[];
  industries: string[];
  validatedClients: string[];
}

export class PerplexityResearchAgent {
  private static endpoint = 'https://api.perplexity.ai/chat/completions';

  static getApiKey(): string | null {
    return localStorage.getItem(LS_KEYS.perplexityApiKey);
  }

  /**
   * Discover company aliases and alternative names
   */
  static async getCompanyAliases(company: string): Promise<string[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Perplexity API key missing');

    const payload = {
      model: 'sonar-pro',
      messages: [
        {
          role: 'user',
          content: `What are the common alternative names, abbreviations, subsidiaries, and brand names for the company "${company}"? Return only a JSON array of strings, no explanation. Example: ["Apple Inc", "Apple Computer", "AAPL"]`
        }
      ]
    };

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
        console.error('Perplexity aliases failed:', response.status);
        return [company]; // fallback to original name
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      
      try {
        const aliases = JSON.parse(content);
        return Array.isArray(aliases) ? aliases.filter(Boolean) : [company];
      } catch {
        // If JSON parsing fails, extract names from text
        const matches = content.match(/"([^"]+)"/g);
        return matches ? matches.map((m: string) => m.replace(/"/g, '')) : [company];
      }
    } catch (error) {
      console.error('Company aliases lookup failed:', error);
      return [company];
    }
  }

  /**
   * Generate relevant industries for the company
   */
  static async getRelevantIndustries(company: string): Promise<string[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Perplexity API key missing');

    const payload = {
      model: 'sonar-pro',
      messages: [
        {
          role: 'user',
          content: `What are the main industries and business sectors that "${company}" operates in? Return only a JSON array of industry names, no explanation. Example: ["Technology", "Consumer Electronics", "Software"]`
        }
      ]
    };

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
        console.error('Perplexity industries failed:', response.status);
        return [];
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      
      try {
        const industries = JSON.parse(content);
        return Array.isArray(industries) ? industries.filter(Boolean) : [];
      } catch {
        // If JSON parsing fails, extract industries from text
        const matches = content.match(/"([^"]+)"/g);
        return matches ? matches.map((m: string) => m.replace(/"/g, '')) : [];
      }
    } catch (error) {
      console.error('Industries lookup failed:', error);
      return [];
    }
  }

  /**
   * Validate and discover clients for the company
   */
  static async validateClients(company: string, clients: string[]): Promise<string[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Perplexity API key missing');

    const payload = {
      model: 'sonar-pro',
      messages: [
        {
          role: 'user',
          content: `Given the company "${company}" and these potential clients: ${clients.join(', ')}. 
          1) Validate which ones are actually known clients/customers of ${company}
          2) Add 3-5 other major known clients of ${company}
          Return only a JSON array of validated and additional client names. Example: ["Microsoft", "Google", "Amazon"]`
        }
      ]
    };

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
        console.error('Perplexity clients validation failed:', response.status);
        return clients; // fallback to original clients
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      
      try {
        const validatedClients = JSON.parse(content);
        return Array.isArray(validatedClients) ? validatedClients.filter(Boolean) : clients;
      } catch {
        // If JSON parsing fails, extract client names from text
        const matches = content.match(/"([^"]+)"/g);
        return matches ? matches.map((m: string) => m.replace(/"/g, '')) : clients;
      }
    } catch (error) {
      console.error('Client validation failed:', error);
      return clients;
    }
  }

  /**
   * Comprehensive company research workflow
   */
  static async researchCompany(company: string, industry: string, clients: string[]): Promise<CompanyResearch> {
    console.log(`Starting comprehensive research for ${company}...`);

    try {
      // Run all research tasks in parallel for efficiency
      const [aliases, industries, validatedClients] = await Promise.all([
        this.getCompanyAliases(company),
        this.getRelevantIndustries(company),
        this.validateClients(company, clients)
      ]);

      // Combine original industry with discovered ones
      const allIndustries = [industry, ...industries].filter((item, index, arr) => 
        item && arr.indexOf(item) === index // remove duplicates
      );

      const result: CompanyResearch = {
        aliases: aliases.length > 0 ? aliases : [company],
        industries: allIndustries,
        validatedClients: validatedClients.length > 0 ? validatedClients : clients
      };

      console.log('Research completed:', {
        aliases: result.aliases.length,
        industries: result.industries.length,
        clients: result.validatedClients.length
      });

      return result;
    } catch (error) {
      console.error('Company research failed:', error);
      // Return fallback data
      return {
        aliases: [company],
        industries: [industry],
        validatedClients: clients
      };
    }
  }
}
