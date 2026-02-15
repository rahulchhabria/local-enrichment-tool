/**
 * Job Posting Scraper
 * Fetches public job listings from Greenhouse, Lever, Ashby
 */

export interface JobPosting {
  title: string;
  department: string;
  location: string;
  remote: boolean;
  postedDate?: Date;
  url: string;
  requiredSkills: string[];
  description: string;
}

export interface HiringData {
  openPositions: number;
  jobListings: JobPosting[];
  departmentHiring: {
    engineering: number;
    sales: number;
    marketing: number;
    customerSuccess: number;
    operations: number;
    other: number;
  };
  hiringVelocity?: number; // Estimated jobs posted in last 30 days
  topSkillsHiring: string[];
}

export class JobScraper {
  /**
   * Find and scrape job postings for a company
   */
  async scrapeJobs(domain: string, companyName: string): Promise<HiringData> {
    console.log(`    → Searching for job postings...`);

    const jobListings: JobPosting[] = [];

    // Try common job board patterns
    const results = await Promise.allSettled([
      this.scrapeGreenhouse(domain, companyName),
      this.scrapeLever(domain, companyName),
      this.scrapeAshby(domain, companyName),
      this.scrapeCareersPage(domain),
    ]);

    // Collect all successful results
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        jobListings.push(...result.value);
      }
    }

    console.log(`    ✓ Found ${jobListings.length} job postings`);

    // Calculate department breakdown
    const departmentHiring = {
      engineering: 0,
      sales: 0,
      marketing: 0,
      customerSuccess: 0,
      operations: 0,
      other: 0,
    };

    for (const job of jobListings) {
      const dept = job.department.toLowerCase();
      if (dept.includes('engineer') || dept.includes('technical') || dept.includes('developer')) {
        departmentHiring.engineering++;
      } else if (dept.includes('sales') || dept.includes('account')) {
        departmentHiring.sales++;
      } else if (dept.includes('marketing') || dept.includes('growth')) {
        departmentHiring.marketing++;
      } else if (dept.includes('customer') || dept.includes('support') || dept.includes('success')) {
        departmentHiring.customerSuccess++;
      } else if (dept.includes('operations') || dept.includes('ops') || dept.includes('finance')) {
        departmentHiring.operations++;
      } else {
        departmentHiring.other++;
      }
    }

    // Extract top skills from all job descriptions
    const topSkillsHiring = this.extractTopSkills(jobListings);

    return {
      openPositions: jobListings.length,
      jobListings,
      departmentHiring,
      topSkillsHiring,
    };
  }

  /**
   * Scrape Greenhouse job board
   */
  private async scrapeGreenhouse(domain: string, companyName: string): Promise<JobPosting[]> {
    try {
      // Greenhouse uses pattern: boards.greenhouse.io/{company}
      const slug = companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      const urls = [
        `https://boards.greenhouse.io/${slug}`,
        `https://boards.greenhouse.io/${domain.split('.')[0]}`,
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000),
          });

          if (!response.ok) continue;

          const html = await response.text();

          // Greenhouse uses sections with data-qa="opening"
          const jobs: JobPosting[] = [];
          const jobMatches = html.matchAll(/<div[^>]*data-qa="opening"[^>]*>([\s\S]*?)<\/div>/g);

          for (const match of jobMatches) {
            const jobHtml = match[1];

            // Extract job title
            const titleMatch = jobHtml.match(/<a[^>]*>(.*?)<\/a>/);
            const title = titleMatch ? titleMatch[1].trim() : '';

            // Extract location
            const locationMatch = jobHtml.match(/location[^>]*>(.*?)</i);
            const location = locationMatch ? locationMatch[1].trim() : '';

            // Extract department
            const deptMatch = jobHtml.match(/department[^>]*>(.*?)</i);
            const department = deptMatch ? deptMatch[1].trim() : 'Other';

            if (title) {
              jobs.push({
                title,
                department,
                location,
                remote: location.toLowerCase().includes('remote'),
                url,
                requiredSkills: [],
                description: '',
              });
            }
          }

          if (jobs.length > 0) {
            console.log(`    ✓ Greenhouse: ${jobs.length} jobs`);
            return jobs;
          }
        } catch (error) {
          continue;
        }
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Scrape Lever job board
   */
  private async scrapeLever(domain: string, companyName: string): Promise<JobPosting[]> {
    try {
      // Lever uses pattern: jobs.lever.co/{company}
      const slug = companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      const urls = [
        `https://jobs.lever.co/${slug}`,
        `https://jobs.lever.co/${domain.split('.')[0]}`,
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000),
          });

          if (!response.ok) continue;

          const html = await response.text();

          // Lever uses posting class
          const jobs: JobPosting[] = [];
          const jobMatches = html.matchAll(/<div[^>]*class="posting"[^>]*>([\s\S]*?)<\/div>/g);

          for (const match of jobMatches) {
            const jobHtml = match[1];

            const titleMatch = jobHtml.match(/<h5[^>]*>(.*?)<\/h5>/);
            const title = titleMatch ? titleMatch[1].trim() : '';

            const locationMatch = jobHtml.match(/location[^>]*>(.*?)</i);
            const location = locationMatch ? locationMatch[1].trim() : '';

            const deptMatch = jobHtml.match(/department[^>]*>(.*?)</i);
            const department = deptMatch ? deptMatch[1].trim() : 'Other';

            if (title) {
              jobs.push({
                title,
                department,
                location,
                remote: location.toLowerCase().includes('remote'),
                url,
                requiredSkills: [],
                description: '',
              });
            }
          }

          if (jobs.length > 0) {
            console.log(`    ✓ Lever: ${jobs.length} jobs`);
            return jobs;
          }
        } catch (error) {
          continue;
        }
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Scrape Ashby job board
   */
  private async scrapeAshby(domain: string, companyName: string): Promise<JobPosting[]> {
    try {
      // Ashby uses pattern: jobs.ashbyhq.com/{company}
      const slug = companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      const urls = [
        `https://jobs.ashbyhq.com/${slug}`,
        `https://jobs.ashbyhq.com/${domain.split('.')[0]}`,
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000),
          });

          if (!response.ok) continue;

          const html = await response.text();

          // Ashby typically uses JSON in script tags
          const jobs: JobPosting[] = [];
          const scriptMatch = html.match(/<script[^>]*>.*?postings.*?(\[[\s\S]*?\])/);

          if (scriptMatch) {
            try {
              const jsonData = JSON.parse(scriptMatch[1]);
              for (const job of jsonData) {
                if (job.title) {
                  jobs.push({
                    title: job.title,
                    department: job.department || job.team || 'Other',
                    location: job.location || '',
                    remote: (job.location || '').toLowerCase().includes('remote'),
                    url,
                    requiredSkills: [],
                    description: job.description || '',
                  });
                }
              }
            } catch (e) {
              // JSON parse failed, continue
            }
          }

          if (jobs.length > 0) {
            console.log(`    ✓ Ashby: ${jobs.length} jobs`);
            return jobs;
          }
        } catch (error) {
          continue;
        }
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Scrape company's own careers page
   */
  private async scrapeCareersPage(domain: string): Promise<JobPosting[]> {
    try {
      const careerUrls = [
        `https://${domain}/careers`,
        `https://${domain}/jobs`,
        `https://${domain}/about/careers`,
        `https://careers.${domain}`,
      ];

      for (const url of careerUrls) {
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000),
          });

          if (!response.ok) continue;

          const html = await response.text();

          // Look for common patterns indicating job postings
          const jobCount = this.estimateJobCount(html);

          if (jobCount > 0) {
            console.log(`    ✓ Careers page: ~${jobCount} positions`);
            // For now, just return count indication
            // Full scraping would need per-site customization
            return [{
              title: 'Various positions',
              department: 'Multiple',
              location: 'Various',
              remote: true,
              url,
              requiredSkills: [],
              description: `Found ${jobCount} job listings on careers page`,
            }];
          }
        } catch (error) {
          continue;
        }
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Estimate job count from careers page HTML
   */
  private estimateJobCount(html: string): number {
    const patterns = [
      /(\d+)\s+open\s+positions?/i,
      /(\d+)\s+openings?/i,
      /(\d+)\s+jobs?/i,
      /we're\s+hiring\s+(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    // Count job-related keywords as proxy
    const jobKeywords = ['engineer', 'developer', 'manager', 'designer', 'analyst'];
    let count = 0;
    for (const keyword of jobKeywords) {
      const matches = html.match(new RegExp(keyword, 'gi'));
      if (matches) count += matches.length;
    }

    return Math.min(count, 50); // Cap at 50 to avoid false positives
  }

  /**
   * Extract top skills mentioned across all job descriptions
   */
  private extractTopSkills(jobs: JobPosting[]): string[] {
    const skillCounts = new Map<string, number>();

    // Common tech skills to look for
    const techSkills = [
      'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Go', 'Rust', 'TypeScript',
      'JavaScript', 'Java', 'Kubernetes', 'Docker', 'AWS', 'GCP', 'Azure',
      'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'Microservices',
      'Machine Learning', 'AI', 'Data Science', 'SQL', 'NoSQL', 'CI/CD',
      'Git', 'Agile', 'Scrum', 'TensorFlow', 'PyTorch', 'Spark', 'Kafka',
    ];

    for (const job of jobs) {
      const text = `${job.title} ${job.description}`.toLowerCase();

      for (const skill of techSkills) {
        if (text.includes(skill.toLowerCase())) {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        }
      }
    }

    // Return top 10 most mentioned skills
    return Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill]) => skill);
  }
}
