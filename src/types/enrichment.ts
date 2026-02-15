/**
 * Company enrichment data types
 * Similar to Clearbit/Apollo data structure
 */

export interface CompanyEnrichmentInput {
  // At least one identifier required
  domain?: string;           // e.g., "anthropic.com"
  companyName?: string;      // e.g., "Anthropic"
  linkedinUrl?: string;      // e.g., "https://linkedin.com/company/anthropic"
}

export interface FundingRound {
  roundType: string;         // Seed, Series A, B, C, etc.
  amount: string;            // e.g., "$750M"
  amountUSD: number;         // Numeric value for sorting
  date: Date;
  leadInvestors: string[];
  allInvestors: string[];
  valuation?: string;
  source: string;            // Where we got this data
}

export interface LeadershipChange {
  personName: string;
  previousRole?: string;
  currentRole: string;
  changeDate: Date;
  changeType: 'hire' | 'promotion' | 'departure';
  linkedinUrl?: string;
  source: string;
}

export interface JobPosting {
  title: string;
  department: string;
  location: string;
  employmentType: string;    // Full-time, Contract, etc.
  postedDate: Date;
  jobUrl: string;
  salary?: string;
  remote: boolean;
}

export interface CompanyEnrichmentData {
  // Basic Info
  name: string;
  legalName?: string;
  domain: string;
  website: string;
  logo?: string;

  // Company Details
  description: string;
  shortDescription?: string;  // One-liner
  founded?: number;            // Year
  employeeCount?: number;
  employeeCountRange?: string; // "51-200", "201-500", etc.
  engineeringCount?: number;   // Number of engineers specifically

  // Location
  headquarters: {
    city?: string;
    state?: string;
    country?: string;
    address?: string;
  };

  // Industry/Vertical
  industry: string[];
  vertical: string[];
  keywords: string[];

  // Funding
  totalFundingRaised?: string;
  totalFundingUSD?: number;
  latestFundingRound?: FundingRound;
  allFundingRounds?: FundingRound[];
  currentValuation?: string;

  // Leadership
  ceo?: {
    name: string;
    linkedinUrl?: string;
  };
  founders?: Array<{
    name: string;
    role?: string;
    linkedinUrl?: string;
  }>;
  recentLeadershipChanges?: LeadershipChange[];

  // Jobs
  openPositions?: number;
  jobPostings?: JobPosting[];

  // Social/Links
  linkedinUrl?: string;
  twitterUrl?: string;
  crunchbaseUrl?: string;
  githubUrl?: string;

  // GitHub Activity
  githubActivity?: {
    publicRepos: number;
    totalStars: number;
    totalForks: number;
    recentCommits: number;
    programmingLanguages: string[];
    topRepos: Array<{
      name: string;
      url: string;
      stars: number;
      language: string;
    }>;
  };

  // Hiring Intelligence
  hiring?: {
    openPositions: number;
    jobListings: Array<{
      title: string;
      department: string;
      location: string;
      remote: boolean;
      url: string;
      requiredSkills: string[];
      description: string;
    }>;
    departmentHiring: {
      engineering: number;
      sales: number;
      marketing: number;
      customerSuccess: number;
      operations: number;
      other: number;
    };
    topSkillsHiring: string[];
  };

  // Technographic Data
  technographic?: {
    frontendFrameworks: string[];
    backendFrameworks: string[];
    databases: string[];
    cloudProviders: string[];
    analyticsTools: string[];
    observabilityStack: string[];
    marketingTools: string[];
    paymentProcessors: string[];
    customerSupport: string[];
    cdnProviders: string[];
    authProviders: string[];
    allTechnologies: Array<{
      name: string;
      category: string;
      confidence: number;
    }>;
  };

  // Mobile Apps
  mobileApps?: {
    hasIosApp: boolean;
    hasAndroidApp: boolean;
    iosApps: Array<{
      appName: string;
      appId?: string;
      appUrl: string;
      detectionMethod: string;
    }>;
    androidApps: Array<{
      appName: string;
      appId?: string;
      appUrl: string;
      detectionMethod: string;
    }>;
  };

  // Metadata
  lastUpdated: Date;
  dataQuality: 'high' | 'medium' | 'low';
  sources: string[];

  // AI-Generated Insights
  aiInsights?: {
    recentNews: string[];
    growthStage: string;      // "Early Stage", "Growth", "Late Stage", "Public"
    competitiveLandscape: string[];
    keyDifferentiators: string[];
    recentProductLaunches?: string[];
    recentAcquisitions?: Array<{
      companyAcquired: string;
      date?: string;
      amount?: string;
      description?: string;
    }>;
    competitorMoves?: Array<{
      competitor: string;
      event: string;          // e.g., "launched new product", "raised funding", "acquired company"
      date?: string;
      impact?: string;        // Why this matters for sales
    }>;
  };
}

export interface EnrichmentResult {
  success: boolean;
  data?: CompanyEnrichmentData;
  error?: string;
  confidence: number;         // 0-100 confidence score
  processingTimeMs: number;
}
