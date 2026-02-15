/**
 * LinkedIn Headcount Fetcher
 * Estimates engineering headcount using LinkedIn's public search
 *
 * Legal basis: hiQ Labs v. LinkedIn (2022) - scraping public data is legal
 * Note: This uses publicly accessible search result pages, not authenticated API
 */

export interface HeadcountEstimate {
  totalEmployees?: number;
  engineeringCount?: number;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  timestamp: Date;
}

export class LinkedInHeadcountFetcher {
  /**
   * Estimate engineering headcount from LinkedIn public search
   * Uses LinkedIn's public people search: linkedin.com/search/results/people/
   */
  async estimateEngineeringCount(
    companyName: string,
    linkedinUrl?: string
  ): Promise<HeadcountEstimate> {
    try {
      console.log(`    → Estimating engineering headcount from LinkedIn...`);

      // Extract company identifier from LinkedIn URL or use company name
      let companyIdentifier = companyName;
      if (linkedinUrl) {
        const match = linkedinUrl.match(/linkedin\.com\/company\/([^/]+)/);
        if (match) {
          companyIdentifier = match[1];
        }
      }

      // Method 1: Try to get count from company page
      const companyPageUrl = linkedinUrl || `https://www.linkedin.com/company/${companyIdentifier}`;
      const companyData = await this.scrapeCompanyPage(companyPageUrl);

      if (companyData.totalEmployees) {
        console.log(`    ✓ Found ${companyData.totalEmployees} total employees on company page`);
      }

      // Method 2: Search for engineers at the company
      // This uses LinkedIn's public people search (no auth required for counts)
      const engineeringKeywords = [
        'engineer',
        'software engineer',
        'engineering',
        'developer',
        'software developer',
      ];

      let maxEngineerCount = 0;
      let bestKeyword = '';

      for (const keyword of engineeringKeywords) {
        const count = await this.searchPeopleCount(companyIdentifier, keyword);
        if (count > maxEngineerCount) {
          maxEngineerCount = count;
          bestKeyword = keyword;
        }
      }

      // Use heuristics to improve estimate
      let engineeringCount = maxEngineerCount;
      let confidence: 'high' | 'medium' | 'low' = 'low';

      if (maxEngineerCount > 0) {
        console.log(`    ✓ Found ~${maxEngineerCount} engineers (keyword: "${bestKeyword}")`);
        confidence = maxEngineerCount > 10 ? 'medium' : 'low';

        // If we have total employees, validate the engineering count
        if (companyData.totalEmployees && maxEngineerCount > companyData.totalEmployees) {
          // Engineering count can't exceed total employees, cap it
          engineeringCount = Math.floor(companyData.totalEmployees * 0.4); // Assume ~40% are engineers
          confidence = 'low';
          console.log(`    ⚠ Engineering count adjusted to ${engineeringCount} (capped at 40% of total)`);
        }
      } else if (companyData.totalEmployees) {
        // Fallback: If we couldn't search LinkedIn but have total employees,
        // estimate engineering count based on industry standards
        // Tech companies typically have 30-50% engineers, use 35% as conservative estimate
        engineeringCount = Math.floor(companyData.totalEmployees * 0.35);
        confidence = 'low';
        console.log(`    ⓘ Estimated ~${engineeringCount} engineers (35% of total employees)`);
      }

      return {
        totalEmployees: companyData.totalEmployees,
        engineeringCount: engineeringCount > 0 ? engineeringCount : undefined,
        confidence,
        source: 'linkedin_public_search',
        timestamp: new Date(),
      };
    } catch (error) {
      console.log(`    ✗ LinkedIn headcount error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return {
        confidence: 'low',
        source: 'linkedin_public_search',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Scrape company page for total employee count
   */
  private async scrapeCompanyPage(url: string): Promise<{ totalEmployees?: number }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {};
      }

      const html = await response.text();

      // LinkedIn shows employee count like "1,234 employees" or "50-100 employees"
      const patterns = [
        /(\d{1,3}(?:,\d{3})*)\s+(?:employees|associates)/i,
        /(\d+)\s+(?:employees|associates)/i,
        /"followerCount"\s*:\s*(\d+)/i, // Sometimes in JSON-LD
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const count = parseInt(match[1].replace(/,/g, ''), 10);
          if (count > 0 && count < 1000000) { // Sanity check
            return { totalEmployees: count };
          }
        }
      }

      // Try to parse employee range (e.g., "51-200 employees")
      const rangeMatch = html.match(/(\d+)-(\d+)\s+(?:employees|associates)/i);
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1], 10);
        const max = parseInt(rangeMatch[2], 10);
        const estimate = Math.floor((min + max) / 2); // Use midpoint
        return { totalEmployees: estimate };
      }

      return {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Search for people with a specific keyword at a company
   * Uses LinkedIn's public search URLs (no authentication required to see result counts)
   */
  private async searchPeopleCount(company: string, keyword: string): Promise<number> {
    try {
      // LinkedIn public search URL pattern
      // Example: linkedin.com/search/results/people/?keywords=engineer%20company%3AAnthro pic
      const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword + ' ' + company)}`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });

      if (!response.ok) {
        return 0;
      }

      const html = await response.text();

      // LinkedIn shows result count like "About 1,234 results" or "1-10 of 234 results"
      const patterns = [
        /About\s+(\d{1,3}(?:,\d{3})*)\s+results?/i,
        /(\d{1,3}(?:,\d{3})*)\s+results?/i,
        /of\s+(\d{1,3}(?:,\d{3})*)\s+results?/i,
        /"totalDisplayCount"\s*:\s*(\d+)/i, // Sometimes in page data
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const count = parseInt(match[1].replace(/,/g, ''), 10);
          if (count > 0 && count < 100000) { // Sanity check
            return count;
          }
        }
      }

      // If no count found, LinkedIn may require login
      // Return 0 to indicate no data available
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Alternative method: Estimate from job postings
   * Companies typically hire ~20% of their team size annually
   * If they have 10 open engineering roles, they likely have ~50 engineers
   */
  estimateFromJobPostings(engineeringJobCount: number): number {
    if (engineeringJobCount === 0) return 0;

    // Conservative estimate: 5:1 ratio (5 existing engineers per open role)
    // This varies by company growth stage:
    // - High-growth startups: 3:1
    // - Steady growth: 5:1
    // - Slow growth: 10:1
    return Math.floor(engineeringJobCount * 5);
  }

  /**
   * Estimate from GitHub activity
   * Active contributors can indicate engineering team size
   */
  estimateFromGitHub(activeContributors: number): number {
    if (activeContributors === 0) return 0;

    // Typically 60-80% of engineers contribute to public repos
    // Use 70% as middle ground
    return Math.floor(activeContributors / 0.7);
  }

  /**
   * Combine multiple estimates with weighted confidence
   */
  combineEstimates(estimates: Array<{ value: number; confidence: number }>): number {
    if (estimates.length === 0) return 0;

    // Weight by confidence and calculate weighted average
    let totalWeight = 0;
    let weightedSum = 0;

    for (const estimate of estimates) {
      weightedSum += estimate.value * estimate.confidence;
      totalWeight += estimate.confidence;
    }

    return Math.floor(weightedSum / totalWeight);
  }
}
