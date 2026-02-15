import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  CompanyEnrichmentInput,
  CompanyEnrichmentData,
  EnrichmentResult,
  FundingRound,
  LeadershipChange,
  JobPosting,
} from '../types/enrichment.js';
import { GitHubFetcher } from './github-fetcher.js';
import { JobScraper } from './job-scraper.js';
import { TechDetector } from './tech-detector.js';
import { MobileAppDetector } from './mobile-app-detector.js';
import { LinkedInHeadcountFetcher } from './linkedin-headcount.js';

/**
 * Company Enrichment Engine
 * Fetches and enriches company data from multiple sources
 */
export class CompanyEnrichmentEngine {
  private model = anthropic('claude-sonnet-4-5-20250929');
  private githubFetcher: GitHubFetcher;
  private jobScraper: JobScraper;
  private techDetector: TechDetector;
  private mobileAppDetector: MobileAppDetector;
  private linkedinHeadcountFetcher: LinkedInHeadcountFetcher;

  constructor() {
    this.githubFetcher = new GitHubFetcher();
    this.jobScraper = new JobScraper();
    this.techDetector = new TechDetector();
    this.mobileAppDetector = new MobileAppDetector();
    this.linkedinHeadcountFetcher = new LinkedInHeadcountFetcher();
  }

  /**
   * Main enrichment function - takes company identifier and returns enriched data
   */
  async enrichCompany(input: CompanyEnrichmentInput): Promise<EnrichmentResult> {
    const startTime = Date.now();

    try {
      console.log(`Enriching company: ${input.companyName || input.domain || input.linkedinUrl}`);

      // Step 0: If only company name provided, find domain
      if (!input.domain && input.companyName) {
        console.log(`  → Finding domain for: ${input.companyName}`);
        input.domain = await this.findDomainFromName(input.companyName) ?? undefined;
        if (input.domain) {
          console.log(`    ✓ Found domain: ${input.domain}`);
        } else {
          console.log(`    ✗ Could not find domain`);
        }
      }

      // Step 1: Fetch data from multiple sources
      const sources: string[] = [];
      let websiteContent = '';
      let websiteHTML = '';
      let linkedinContent = '';
      let crunchbaseData = '';

      // Fetch company website
      if (input.domain) {
        console.log(`  → Fetching website: ${input.domain}`);
        const websiteData = await this.fetchWebsite(input.domain);
        websiteContent = websiteData.text;
        websiteHTML = websiteData.html;
        if (websiteContent) sources.push('company_website');
      }

      // Search for company on LinkedIn (scraping requires auth, so we'll simulate)
      if (input.linkedinUrl || input.companyName) {
        console.log(`  → Fetching LinkedIn data...`);
        linkedinContent = await this.fetchLinkedInData(input.linkedinUrl || input.companyName || '');
        if (linkedinContent) sources.push('linkedin');
      }

      // Search Crunchbase (requires API key, we'll use web search as proxy)
      if (input.companyName || input.domain) {
        console.log(`  → Searching Crunchbase...`);
        crunchbaseData = await this.searchCrunchbase(input.companyName || input.domain || '');
        if (crunchbaseData) sources.push('crunchbase');
      }

      // Step 2: Fetch GitHub data
      let githubData = null;
      if (input.domain) {
        const companyName = input.companyName || input.domain.split('.')[0];
        const githubOrg = await this.githubFetcher.findOrgFromDomain(input.domain, companyName);
        if (githubOrg) {
          githubData = await this.githubFetcher.fetchOrgData(githubOrg);
          if (githubData) sources.push('github');
        }
      }

      // Step 3: Fetch job postings and calculate hiring data
      let hiringData = null;
      let htmlForTech = '';
      if (input.domain) {
        const companyName = input.companyName || input.domain.split('.')[0];
        hiringData = await this.jobScraper.scrapeJobs(input.domain, companyName);
        if (hiringData.openPositions > 0) sources.push('job_boards');

        // Store HTML for tech detection - use raw HTML, not cleaned text!
        htmlForTech = websiteHTML;
      }

      // Step 4: Detect tech stack
      let techStack = null;
      if (htmlForTech) {
        const url = input.domain?.startsWith('http') ? input.domain : `https://${input.domain}`;
        techStack = await this.techDetector.detectTechStack(htmlForTech, url);

        // Enhance with job posting tech mentions
        if (hiringData && hiringData.jobListings.length > 0) {
          const jobDescriptions = hiringData.jobListings.map(j => j.title + ' ' + j.description);
          const techFromJobs = this.techDetector.detectFromJobPostings(jobDescriptions);
          hiringData.topSkillsHiring = techFromJobs;
        }

        if (techStack.allTechnologies.length > 0) sources.push('tech_detection');
      }

      // Step 4.5: Detect mobile apps
      let mobileAppData = null;
      if (websiteHTML && input.domain) {
        console.log('  → Detecting mobile apps...');
        mobileAppData = await this.mobileAppDetector.detectMobileApps(websiteHTML, input.domain);
        if (mobileAppData.allApps.length > 0) {
          console.log(`    ✓ Found ${mobileAppData.allApps.length} mobile app(s)`);
          if (mobileAppData.hasIosApp) console.log(`      • iOS app detected`);
          if (mobileAppData.hasAndroidApp) console.log(`      • Android app detected`);
          sources.push('mobile_app_detection');
        } else {
          console.log(`    ✗ No mobile apps detected`);
        }
      }

      // Step 5: Extract social media links from HTML
      const socialLinks = await this.extractSocialLinks(websiteHTML, input.domain || '');

      // Step 5.5: Fetch engineering headcount from LinkedIn
      let headcountData = null;
      if (input.companyName) {
        headcountData = await this.linkedinHeadcountFetcher.estimateEngineeringCount(
          input.companyName,
          socialLinks.linkedin
        );

        // Enhance with estimates from other sources
        if (hiringData && githubData) {
          const estimates = [];

          // Add LinkedIn estimate if available
          if (headcountData.engineeringCount) {
            estimates.push({
              value: headcountData.engineeringCount,
              confidence: headcountData.confidence === 'high' ? 0.8 : headcountData.confidence === 'medium' ? 0.5 : 0.3,
            });
          }

          // Add job posting estimate
          const jobEstimate = this.linkedinHeadcountFetcher.estimateFromJobPostings(
            hiringData.departmentHiring.engineering
          );
          if (jobEstimate > 0) {
            estimates.push({ value: jobEstimate, confidence: 0.4 });
          }

          // Add GitHub estimate
          const githubContributors = githubData.recentActivity?.contributorsLast30Days || 0;
          if (githubContributors > 0) {
            const githubEstimate = this.linkedinHeadcountFetcher.estimateFromGitHub(githubContributors);
            estimates.push({ value: githubEstimate, confidence: 0.5 });
          }

          // Combine estimates if we have multiple sources
          if (estimates.length > 1) {
            const combined = this.linkedinHeadcountFetcher.combineEstimates(estimates);
            headcountData.engineeringCount = combined;
            console.log(`    ✓ Combined estimate: ${combined} engineers (from ${estimates.length} sources)`);
          }
        }

        if (headcountData.engineeringCount || headcountData.totalEmployees) {
          sources.push('linkedin_headcount');
        }
      }

      // Step 6: Use AI to extract and structure all the data
      console.log(`  → Analyzing data with AI...`);
      const enrichedData = await this.extractWithAI(
        input,
        websiteContent,
        linkedinContent,
        crunchbaseData,
        sources,
        githubData,
        hiringData,
        techStack,
        socialLinks,
        mobileAppData,
        headcountData
      );

      const processingTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: enrichedData,
        confidence: this.calculateConfidence(enrichedData, sources),
        processingTimeMs,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      console.error('Enrichment error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        confidence: 0,
        processingTimeMs,
      };
    }
  }

  /**
   * Find company domain from just the name using AI and web search
   */
  private async findDomainFromName(companyName: string): Promise<string | null> {
    try {
      // First, use AI to get the domain (AI has knowledge of most companies)
      const schema = z.object({
        domain: z.string().optional(),
        confidence: z.number().optional(),
      });

      const { object } = await generateObject({
        model: this.model,
        schema,
        prompt: `What is the primary website domain for the company "${companyName}"?

Return just the domain (e.g., "stripe.com", "linear.app", "anthropic.com"), not the full URL.
Be sure to include the correct TLD (.com, .io, .ai, .app, etc.).

Examples:
- Company: "Stripe" → domain: "stripe.com"
- Company: "Linear" → domain: "linear.app"
- Company: "Anthropic" → domain: "anthropic.com"
- Company: "Perplexity" → domain: "perplexity.ai"

If you're not confident about the domain, return null.`,
      });

      if (object.domain) {
        // Verify the domain actually works
        try {
          const response = await fetch(`https://${object.domain}`, {
            method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000),
          });

          if (response.ok) {
            return object.domain;
          }
        } catch (error) {
          // Domain might exist but blocks HEAD requests, try GET as fallback
          try {
            const getResponse = await fetch(`https://${object.domain}`, {
              method: 'GET',
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(8000),
            });

            if (getResponse.ok || getResponse.status === 403) {
              // 403 means site exists but blocks us, still use it
              return object.domain;
            }
          } catch (e) {
            // Really doesn't work, try common patterns
          }
        }
      }

      // If AI domain doesn't work, try common patterns
      const commonPatterns = [
        companyName.toLowerCase().replace(/\s+/g, '') + '.com',
        companyName.toLowerCase().replace(/\s+/g, '') + '.io',
        companyName.toLowerCase().replace(/\s+/g, '') + '.ai',
        companyName.toLowerCase().replace(/\s+/g, '') + '.app',
        companyName.toLowerCase().replace(/\s+/g, '-') + '.com',
      ];

      for (const domain of commonPatterns) {
        try {
          const response = await fetch(`https://${domain}`, {
            method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            return domain;
          }
        } catch (error) {
          continue;
        }
      }

      return null;
    } catch (error) {
      console.log(`    ✗ Domain discovery error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  /**
   * Extract social media links from HTML
   */
  private async extractSocialLinks(html: string, domain: string): Promise<{ twitter?: string; linkedin?: string; github?: string }> {
    const links: { twitter?: string; linkedin?: string; github?: string } = {};

    // 1. Try meta tags first (most reliable)
    const twitterMetaMatch = html.match(/<meta[^>]*name=["']twitter:site["'][^>]*content=["']@?([a-zA-Z0-9_]+)["']/i);
    if (twitterMetaMatch) {
      links.twitter = `https://x.com/${twitterMetaMatch[1]}`;
    }

    // 2. Try JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);

        // Handle array or single object
        const data = Array.isArray(jsonData) ? jsonData : [jsonData];

        for (const item of data) {
          if (item.sameAs && Array.isArray(item.sameAs)) {
            for (const url of item.sameAs) {
              if (!links.twitter && (url.includes('twitter.com') || url.includes('x.com'))) {
                const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
                if (match) links.twitter = `https://x.com/${match[1]}`;
              }
              if (!links.linkedin && url.includes('linkedin.com/company/')) {
                const match = url.match(/linkedin\.com\/company\/([a-zA-Z0-9_-]+)/);
                if (match) links.linkedin = `https://linkedin.com/company/${match[1]}`;
              }
              if (!links.github && url.includes('github.com')) {
                const match = url.match(/github\.com\/([a-zA-Z0-9_-]+)/);
                if (match) links.github = `https://github.com/${match[1]}`;
              }
            }
          }
        }
      } catch (e) {
        // JSON parsing failed, continue with other methods
      }
    }

    // 3. Extract from regular links in HTML
    if (!links.twitter) {
      const twitterPatterns = [
        /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/gi,
      ];

      for (const pattern of twitterPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const handle = match[1];
          // Skip generic paths
          if (!['intent', 'share', 'home', 'i', 'explore', 'notifications', 'messages'].includes(handle.toLowerCase())) {
            links.twitter = `https://x.com/${handle}`;
            break;
          }
        }
        if (links.twitter) break;
      }
    }

    // Extract LinkedIn from links
    if (!links.linkedin) {
      const linkedinPatterns = [
        /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9_-]+)/gi,
      ];

      for (const pattern of linkedinPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const company = match[1];
          links.linkedin = `https://linkedin.com/company/${company}`;
          break;
        }
        if (links.linkedin) break;
      }
    }

    // Extract GitHub from links
    if (!links.github) {
      const githubPatterns = [
        /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)(?!\/)/gi,
      ];

      for (const pattern of githubPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const org = match[1];
          // Skip generic paths
          if (!['features', 'pricing', 'enterprise', 'explore', 'marketplace', 'sponsors'].includes(org.toLowerCase())) {
            links.github = `https://github.com/${org}`;
            break;
          }
        }
        if (links.github) break;
      }
    }

    // Verify links actually exist before returning them
    const verifiedLinks: { twitter?: string; linkedin?: string; github?: string } = {};

    if (links.twitter) {
      const exists = await this.verifyUrlExists(links.twitter);
      if (exists) verifiedLinks.twitter = links.twitter;
    }

    if (links.linkedin) {
      const exists = await this.verifyUrlExists(links.linkedin);
      if (exists) verifiedLinks.linkedin = links.linkedin;
    }

    if (links.github) {
      const exists = await this.verifyUrlExists(links.github);
      if (exists) verifiedLinks.github = links.github;
    }

    if (verifiedLinks.twitter || verifiedLinks.linkedin || verifiedLinks.github) {
      console.log(`    ✓ Verified social links: ${Object.keys(verifiedLinks).join(', ')}`);
    }

    return verifiedLinks;
  }

  /**
   * Verify that a URL actually exists
   */
  private async verifyUrlExists(url: string): Promise<boolean> {
    try {
      // Try HEAD first (faster)
      const headResponse = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });

      // Accept 200 OK or 999 (LinkedIn's rate limit response which means page exists)
      if (headResponse.ok || headResponse.status === 999) {
        return true;
      }

      // If HEAD fails, try GET (some sites block HEAD)
      if (headResponse.status === 405 || headResponse.status === 403) {
        const getResponse = await fetch(url, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(5000),
          redirect: 'follow',
        });

        return getResponse.ok;
      }

      return false;
    } catch (error) {
      // Network error, URL doesn't exist
      return false;
    }
  }

  /**
   * Fetch and parse company website
   */
  private async fetchWebsite(domain: string): Promise<{ text: string; html: string }> {
    try {
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CompanyEnrichment/1.0)',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        console.log(`    ✗ Website fetch failed: ${response.status}`);
        return { text: '', html: '' };
      }

      const html = await response.text();

      // Extract text content from HTML (simple version)
      const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      console.log(`    ✓ Website fetched (${text.length} chars)`);
      return {
        text: text.substring(0, 10000), // Limit to 10k chars
        html: html.substring(0, 50000), // Keep more HTML for link extraction
      };
    } catch (error) {
      console.log(`    ✗ Website fetch error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { text: '', html: '' };
    }
  }

  /**
   * Fetch LinkedIn company data (mock for now - requires LinkedIn API or scraping)
   */
  private async fetchLinkedInData(linkedinUrlOrName: string): Promise<string> {
    // In production, you'd use:
    // 1. LinkedIn API (requires partnership)
    // 2. Scraping service (Bright Data, ScrapingBee)
    // 3. Pre-built datasets

    // For now, we'll return mock data structure
    console.log(`    ⓘ LinkedIn scraping requires authentication (simulating)`);
    return '';
  }

  /**
   * Search Crunchbase for company data
   */
  private async searchCrunchbase(companyName: string): Promise<string> {
    // In production, you'd use Crunchbase API
    // For now, we'll try to fetch from their public pages
    try {
      const slug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const url = `https://www.crunchbase.com/organization/${slug}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CompanyEnrichment/1.0)',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const html = await response.text();
        console.log(`    ✓ Crunchbase data fetched`);
        return html.substring(0, 15000);
      } else {
        console.log(`    ✗ Crunchbase not found`);
        return '';
      }
    } catch (error) {
      console.log(`    ✗ Crunchbase error`);
      return '';
    }
  }

  /**
   * Use AI to extract structured data from all sources
   */
  private async extractWithAI(
    input: CompanyEnrichmentInput,
    websiteContent: string,
    linkedinContent: string,
    crunchbaseData: string,
    sources: string[],
    githubData: any = null,
    hiringData: any = null,
    techStack: any = null,
    socialLinks: { twitter?: string; linkedin?: string; github?: string } = {},
    mobileAppData: any = null,
    headcountData: any = null
  ): Promise<CompanyEnrichmentData> {
    const schema = z.object({
      name: z.string(),
      domain: z.string(),
      description: z.string(),
      shortDescription: z.string().optional(),
      founded: z.number().optional(),
      employeeCount: z.number().optional(),
      employeeCountRange: z.string().optional(),
      headquarters: z.object({
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
      }),
      industry: z.array(z.string()),
      vertical: z.array(z.string()),
      totalFundingRaised: z.string().optional(),
      latestRoundType: z.string().optional(),
      latestRoundAmount: z.string().optional(),
      latestRoundDate: z.string().optional(),
      currentValuation: z.string().optional(),
      ceoName: z.string().optional(),
      founders: z.array(z.string()).optional(),
      openPositions: z.number().optional(),
      linkedinUrl: z.string().optional(),
      twitterUrl: z.string().optional(),
      twitterHandle: z.string().optional(),
      growthStage: z.string().optional(),
      recentNews: z.array(z.string()).optional(),
      productDescription: z.string().optional(),
      recentProductLaunches: z.array(z.string()).optional(),
      recentAcquisitions: z.array(z.object({
        companyAcquired: z.string(),
        date: z.string().optional(),
        amount: z.string().optional(),
        description: z.string().optional(),
      })).optional(),
      competitorMoves: z.array(z.object({
        competitor: z.string(),
        event: z.string(),
        date: z.string().optional(),
        impact: z.string().optional(),
      })).optional(),
    });

    const prompt = `
You are a company data enrichment AI. Extract as much accurate information as possible about this company.

INPUT:
${input.companyName ? `Company Name: ${input.companyName}` : ''}
${input.domain ? `Domain: ${input.domain}` : ''}
${input.linkedinUrl ? `LinkedIn: ${input.linkedinUrl}` : ''}

WEBSITE CONTENT:
${websiteContent || 'Not available'}

LINKEDIN DATA:
${linkedinContent || 'Not available'}

CRUNCHBASE DATA:
${crunchbaseData || 'Not available'}

Extract all relevant company information including:
- Company name, description, founding year
- Employee count (look for "team of X" or similar phrases)
- Headquarters location
- Industry/vertical
- Funding information (total raised, latest round)
- Leadership (CEO, founders)
- Social media links (LinkedIn, Twitter/X - extract the handle like "@company")
- Open positions (look for "we're hiring" or careers page mentions)
- Recent news or product updates

SALES INTELLIGENCE - Extract the following if available:
- recentProductLaunches: Recent product launches or feature announcements (last 6 months)
- recentAcquisitions: Companies they've acquired (include date, amount if known, and description)
- competitorMoves: Recent moves by their competitors that might create sales opportunities
  * For each competitor move, include:
    - competitor: Name of the competitor
    - event: What happened (e.g., "raised $50M Series B", "launched new AI product", "acquired DataCorp")
    - date: When it happened (if available)
    - impact: Why this matters for sales (e.g., "competitor momentum may pressure prospect to evaluate alternatives")

IMPORTANT for Twitter/X:
- If you find a Twitter/X link, extract it as twitterUrl
- Also extract just the handle (without @) as twitterHandle
- Look for links like twitter.com/company or x.com/company

Be accurate - only include information you can verify from the content provided.
If information is not available, omit the field.
`.trim();

    const { object } = await generateObject({
      model: this.model,
      schema,
      prompt,
    });

    // Build the enriched data structure
    const enrichedData: CompanyEnrichmentData = {
      name: object.name,
      domain: object.domain,
      website: `https://${object.domain}`,
      description: object.description,
      shortDescription: object.shortDescription,
      founded: object.founded,
      employeeCount: headcountData?.totalEmployees || object.employeeCount,
      employeeCountRange: object.employeeCountRange,
      engineeringCount: headcountData?.engineeringCount,
      headquarters: object.headquarters,
      industry: object.industry,
      vertical: object.vertical,
      keywords: [],
      totalFundingRaised: object.totalFundingRaised,
      currentValuation: object.currentValuation,
      openPositions: object.openPositions,
      linkedinUrl: socialLinks.linkedin, // Only use verified links
      twitterUrl: socialLinks.twitter,   // Only use verified links
      githubUrl: socialLinks.github,     // Only use verified links (will be added later)
      lastUpdated: new Date(),
      dataQuality: sources.length >= 2 ? 'high' : sources.length === 1 ? 'medium' : 'low',
      sources,
    };

    if (object.latestRoundType) {
      enrichedData.latestFundingRound = {
        roundType: object.latestRoundType,
        amount: object.latestRoundAmount || 'Unknown',
        amountUSD: 0, // Would need parsing
        date: object.latestRoundDate ? new Date(object.latestRoundDate) : new Date(),
        leadInvestors: [],
        allInvestors: [],
        source: sources[0] || 'ai_extraction',
      };
    }

    if (object.ceoName) {
      enrichedData.ceo = {
        name: object.ceoName,
      };
    }

    if (object.founders && object.founders.length > 0) {
      enrichedData.founders = object.founders.map(name => ({ name }));
    }

    if (object.growthStage || object.recentNews || object.productDescription || object.recentProductLaunches || object.recentAcquisitions || object.competitorMoves) {
      enrichedData.aiInsights = {
        recentNews: object.recentNews || [],
        growthStage: object.growthStage || 'Unknown',
        competitiveLandscape: [],
        keyDifferentiators: object.productDescription ? [object.productDescription] : [],
        recentProductLaunches: object.recentProductLaunches,
        recentAcquisitions: object.recentAcquisitions,
        competitorMoves: object.competitorMoves,
      };
    }

    // Add GitHub data
    if (githubData) {
      enrichedData.githubUrl = githubData.organization?.url;
      enrichedData.githubActivity = {
        publicRepos: githubData.organization?.publicRepos || 0,
        totalStars: githubData.totalStars || 0,
        totalForks: githubData.totalForks || 0,
        recentCommits: githubData.recentActivity?.commitsLast30Days || 0,
        programmingLanguages: githubData.programmingLanguages?.slice(0, 5).map((l: any) => l.language) || [],
        topRepos: githubData.repositories?.slice(0, 3).map((r: any) => ({
          name: r.name,
          url: r.url,
          stars: r.stars,
          language: r.language,
        })) || [],
      };
    }

    // Add hiring data
    if (hiringData) {
      enrichedData.openPositions = hiringData.openPositions;
      enrichedData.hiring = {
        openPositions: hiringData.openPositions,
        jobListings: hiringData.jobListings.slice(0, 10), // Top 10 jobs
        departmentHiring: hiringData.departmentHiring,
        topSkillsHiring: hiringData.topSkillsHiring,
      };
    }

    // Add tech stack data
    if (techStack) {
      enrichedData.technographic = {
        frontendFrameworks: techStack.frontendFrameworks.map((t: any) => t.name),
        backendFrameworks: techStack.backendFrameworks.map((t: any) => t.name),
        databases: techStack.databases.map((t: any) => t.name),
        cloudProviders: techStack.cloudProviders.map((t: any) => t.name),
        analyticsTools: techStack.analyticsTools.map((t: any) => t.name),
        observabilityStack: techStack.observabilityStack.map((t: any) => t.name),
        marketingTools: techStack.marketingTools.map((t: any) => t.name),
        paymentProcessors: techStack.paymentProcessors.map((t: any) => t.name),
        customerSupport: techStack.customerSupport.map((t: any) => t.name),
        cdnProviders: techStack.cdnProviders.map((t: any) => t.name),
        authProviders: techStack.authProviders.map((t: any) => t.name),
        allTechnologies: techStack.allTechnologies.slice(0, 30).map((t: any) => ({
          name: t.name,
          category: t.category,
          confidence: t.confidence,
        })),
      };
    }

    // Add mobile app data
    if (mobileAppData) {
      enrichedData.mobileApps = {
        hasIosApp: mobileAppData.hasIosApp,
        hasAndroidApp: mobileAppData.hasAndroidApp,
        iosApps: mobileAppData.iosApps.map((app: any) => ({
          appName: app.appName,
          appId: app.appId,
          appUrl: app.appUrl,
          detectionMethod: app.detectionMethod,
        })),
        androidApps: mobileAppData.androidApps.map((app: any) => ({
          appName: app.appName,
          appId: app.appId,
          appUrl: app.appUrl,
          detectionMethod: app.detectionMethod,
        })),
      };
    }

    return enrichedData;
  }

  /**
   * Calculate confidence score based on data sources and completeness
   */
  private calculateConfidence(data: CompanyEnrichmentData, sources: string[]): number {
    let score = 0;

    // Base score from number of sources
    score += sources.length * 20; // 20 points per source

    // Points for key fields
    if (data.employeeCount) score += 10;
    if (data.totalFundingRaised) score += 10;
    if (data.headquarters.city) score += 5;
    if (data.founded) score += 5;
    if (data.latestFundingRound) score += 10;
    if (data.ceo) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Batch enrich multiple companies
   */
  async enrichBatch(inputs: CompanyEnrichmentInput[]): Promise<EnrichmentResult[]> {
    console.log(`Batch enriching ${inputs.length} companies...`);
    const results = await Promise.all(
      inputs.map(input => this.enrichCompany(input))
    );
    return results;
  }
}
