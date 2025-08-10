import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aggqkemnrfvogfmjcjsr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ3FrZW1ucmZ2b2dmbWpjanNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MzM3NjksImV4cCI6MjA3MDQwOTc2OX0.BWwrzo5FfagEujmPowftkIZPw3zw5OjgEIBv3hya5tk';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface SchoolabRecord {
  id?: number;
  created_at?: string;
  query: string;
  report: string;
}

export class SchoolabCache {
  /**
   * Get all cached reports for a company
   */
  static async getAllCachedReports(companyName: string): Promise<SchoolabRecord[]> {
    try {
      const { data, error } = await supabase
        .from('schoolab')
        .select('*')
        .ilike('query', `%${companyName}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase all reports lookup error:', error);
        return [];
      }

      if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} cached reports for ${companyName}`);
        return data;
      }

      console.log(`❌ No cached reports found for ${companyName}`);
      return [];
    } catch (error) {
      console.error('All reports lookup failed:', error);
      return [];
    }
  }

  /**
   * Check if a company research report exists in cache (single latest)
   */
  static async getCachedReport(companyName: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('schoolab')
        .select('report')
        .ilike('query', `%${companyName}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Supabase cache lookup error:', error);
        return null;
      }

      if (data && data.length > 0) {
        console.log(`✅ Found cached report for ${companyName}`);
        return data[0].report;
      }

      console.log(`❌ No cached report found for ${companyName}`);
      return null;
    } catch (error) {
      console.error('Cache lookup failed:', error);
      return null;
    }
  }

  /**
   * Save a new research report to cache
   */
  static async saveReport(companyName: string, report: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('schoolab')
        .insert([
          {
            query: companyName,
            report: report
          }
        ]);

      if (error) {
        console.error('Supabase cache save error:', error);
        return false;
      }

      console.log(`✅ Saved report to cache for ${companyName}`);
      return true;
    } catch (error) {
      console.error('Cache save failed:', error);
      return false;
    }
  }

  /**
   * Update existing report in cache
   */
  static async updateReport(companyName: string, report: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('schoolab')
        .update({ report: report })
        .ilike('query', `%${companyName}%`);

      if (error) {
        console.error('Supabase cache update error:', error);
        return false;
      }

      console.log(`✅ Updated cached report for ${companyName}`);
      return true;
    } catch (error) {
      console.error('Cache update failed:', error);
      return false;
    }
  }
}
