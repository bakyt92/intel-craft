export interface ResearchAPIResult {
  success: boolean;
  message: string;
  rounds?: number;
}

export class ResearchAPIAgent {
  private static readonly BASE_URL = 'https://distracted-euclid-bocb.shuttle.app';

  /**
   * Check if the Research API is healthy and available
   */
  static async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Checking Research API health...');
      const response = await fetch(`${this.BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const text = await response.text();
        console.log('✅ Research API health check passed:', text);
        return true;
      } else {
        console.warn('⚠️ Research API health check failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Research API health check error:', error);
      return false;
    }
  }

  /**
   * Generate a research query from company inputs
   */
  static generateResearchQuery(company: string, industry: string, clients: string[]): string {
    const clientsText = clients.length > 0 ? ` and its relationships with ${clients.join(', ')}` : '';
    return `Research about ${company} market position in ${industry} industry${clientsText}`;
  }

  /**
   * Start research using the external Research API
   */
  static async startResearch(query: string): Promise<ResearchAPIResult> {
    try {
      console.log('🔬 Starting Research API with query:', query);

      // First check if API is healthy
      const isHealthy = await this.healthCheck();
      if (!isHealthy) {
        return {
          success: false,
          message: 'Research API is not available - health check failed'
        };
      }

      // Make the research request using POST method
      const response = await fetch(`${this.BASE_URL}/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Research API request failed:', response.status, errorText);
        return {
          success: false,
          message: `Research API request failed: ${response.status} ${response.statusText}`
        };
      }

      const result = await response.json();
      console.log('✅ Research API completed:', result);

      return {
        success: result.success || false,
        message: result.message || 'Research completed',
        rounds: result.rounds || 0
      };

    } catch (error) {
      console.error('❌ Research API error:', error);
      return {
        success: false,
        message: `Research API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
