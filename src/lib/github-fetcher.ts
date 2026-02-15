/**
 * GitHub API integration
 * Fetches public repo data, activity, contributors, tech stack
 */

export interface GitHubData {
  organization?: {
    login: string;
    name: string;
    url: string;
    avatarUrl: string;
    publicRepos: number;
    followers: number;
    createdAt: Date;
  };
  repositories: GitHubRepo[];
  totalStars: number;
  totalForks: number;
  programmingLanguages: LanguageStats[];
  recentActivity: {
    commitsLast30Days: number;
    contributorsLast30Days: number;
  };
}

export interface GitHubRepo {
  name: string;
  fullName: string;
  url: string;
  description: string;
  stars: number;
  forks: number;
  watchers: number;
  language: string;
  languages: { [key: string]: number };
  topics: string[];
  createdAt: Date;
  updatedAt: Date;
  pushedAt: Date;
  isArchived: boolean;
  license?: string;
}

export interface LanguageStats {
  language: string;
  bytes: number;
  percentage: number;
}

export class GitHubFetcher {
  private baseUrl = 'https://api.github.com';
  private token?: string;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
  }

  /**
   * Find GitHub organization from company domain
   */
  async findOrgFromDomain(domain: string, companyName: string): Promise<string | null> {
    // Try common patterns
    const possibleOrgs = [
      companyName.toLowerCase().replace(/\s+/g, ''),
      companyName.toLowerCase().replace(/\s+/g, '-'),
      domain.split('.')[0],
    ];

    for (const org of possibleOrgs) {
      try {
        const response = await this.fetch(`/orgs/${org}`);
        if (response.ok) {
          return org;
        }
      } catch (error) {
        // Try next
      }
    }

    return null;
  }

  /**
   * Fetch organization data
   */
  async fetchOrgData(org: string): Promise<GitHubData | null> {
    try {
      console.log(`    → Fetching GitHub data for: ${org}`);

      // Get org info
      const orgResponse = await this.fetch(`/orgs/${org}`);
      if (!orgResponse.ok) {
        console.log(`    ✗ GitHub org not found: ${org}`);
        return null;
      }

      const orgData: any = await orgResponse.json();

      // Get repos
      const reposResponse = await this.fetch(`/orgs/${org}/repos?per_page=100&sort=stars`);
      const repos = await reposResponse.json() as any[];

      // Process repos
      const repositories: GitHubRepo[] = [];
      let totalStars = 0;
      let totalForks = 0;
      const languageBytes: { [key: string]: number } = {};

      for (const repo of repos.slice(0, 20)) { // Top 20 repos
        if (repo.archived) continue;

        totalStars += repo.stargazers_count || 0;
        totalForks += repo.forks_count || 0;

        // Get languages for this repo
        try {
          const langResponse = await this.fetch(`/repos/${repo.full_name}/languages`);
          const languages = await langResponse.json() as Record<string, number>;

          for (const [lang, bytes] of Object.entries(languages)) {
            languageBytes[lang] = (languageBytes[lang] || 0) + bytes;
          }

          repositories.push({
            name: repo.name,
            fullName: repo.full_name,
            url: repo.html_url,
            description: repo.description || '',
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            watchers: repo.watchers_count || 0,
            language: repo.language || 'Unknown',
            languages,
            topics: repo.topics || [],
            createdAt: new Date(repo.created_at),
            updatedAt: new Date(repo.updated_at),
            pushedAt: new Date(repo.pushed_at),
            isArchived: repo.archived,
            license: repo.license?.spdx_id,
          });
        } catch (error) {
          // Skip if languages fail
        }
      }

      // Calculate language percentages
      const totalBytes = Object.values(languageBytes).reduce((a, b) => a + b, 0);
      const programmingLanguages: LanguageStats[] = Object.entries(languageBytes)
        .map(([language, bytes]) => ({
          language,
          bytes,
          percentage: Math.round((bytes / totalBytes) * 100),
        }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 10); // Top 10 languages

      console.log(`    ✓ Found ${repositories.length} repos, ${totalStars} stars`);

      return {
        organization: {
          login: orgData.login,
          name: orgData.name || orgData.login,
          url: orgData.html_url,
          avatarUrl: orgData.avatar_url,
          publicRepos: orgData.public_repos,
          followers: orgData.followers,
          createdAt: new Date(orgData.created_at),
        },
        repositories,
        totalStars,
        totalForks,
        programmingLanguages,
        recentActivity: {
          commitsLast30Days: 0, // Would need commits API
          contributorsLast30Days: 0,
        },
      };
    } catch (error) {
      console.log(`    ✗ GitHub error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return null;
    }
  }

  /**
   * Fetch with authentication if available
   */
  private async fetch(path: string): Promise<Response> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CompanyEnrichment/1.0',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return fetch(`${this.baseUrl}${path}`, { headers });
  }
}
