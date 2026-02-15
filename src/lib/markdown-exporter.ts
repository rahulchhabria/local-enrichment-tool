import { CompanyEnrichmentData } from '../types/enrichment.js';
import fs from 'fs/promises';
import path from 'path';

export class MarkdownExporter {
  private outputDir: string;

  constructor(outputDir: string = './output') {
    this.outputDir = outputDir;
  }

  async ensureOutputDir(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  formatCompany(data: CompanyEnrichmentData): string {
    const lines: string[] = [];

    lines.push(`# ${data.name}`);
    lines.push('');

    if (data.shortDescription) {
      lines.push(`> ${data.shortDescription}`);
      lines.push('');
    }

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| **Website** | [${data.domain}](${data.website}) |`);
    if (data.founded) lines.push(`| **Founded** | ${data.founded} |`);
    if (data.employeeCount) lines.push(`| **Employees** | ${data.employeeCount.toLocaleString()}${data.employeeCountRange ? ` (${data.employeeCountRange})` : ''} |`);
    if (data.engineeringCount) lines.push(`| **Engineers** | ~${data.engineeringCount.toLocaleString()} |`);
    if (data.headquarters.city) {
      const hq = [data.headquarters.city, data.headquarters.state, data.headquarters.country].filter(Boolean).join(', ');
      lines.push(`| **HQ** | ${hq} |`);
    }
    if (data.industry.length > 0) lines.push(`| **Industry** | ${data.industry.join(', ')} |`);
    if (data.aiInsights?.growthStage) lines.push(`| **Stage** | ${data.aiInsights.growthStage} |`);
    lines.push('');

    // Description
    if (data.description) {
      lines.push('## Description');
      lines.push('');
      lines.push(data.description);
      lines.push('');
    }

    // Funding
    if (data.totalFundingRaised || data.latestFundingRound) {
      lines.push('## Funding');
      lines.push('');
      if (data.totalFundingRaised) lines.push(`**Total Raised:** ${data.totalFundingRaised}`);
      if (data.currentValuation) lines.push(`  \n**Valuation:** ${data.currentValuation}`);
      lines.push('');
      if (data.latestFundingRound) {
        lines.push(`**Latest Round:** ${data.latestFundingRound.roundType} — ${data.latestFundingRound.amount}`);
        if (data.latestFundingRound.leadInvestors.length > 0) {
          lines.push(`  \n**Lead Investors:** ${data.latestFundingRound.leadInvestors.join(', ')}`);
        }
        lines.push('');
      }
    }

    // Leadership
    if (data.ceo || (data.founders && data.founders.length > 0)) {
      lines.push('## Leadership');
      lines.push('');
      if (data.ceo) lines.push(`- **CEO:** ${data.ceo.name}`);
      if (data.founders && data.founders.length > 0) {
        lines.push(`- **Founders:** ${data.founders.map(f => f.name).join(', ')}`);
      }
      lines.push('');
    }

    // Tech Stack
    if (data.technographic && data.technographic.allTechnologies.length > 0) {
      lines.push('## Tech Stack');
      lines.push('');
      const categories = new Map<string, string[]>();
      for (const tech of data.technographic.allTechnologies) {
        if (!categories.has(tech.category)) categories.set(tech.category, []);
        categories.get(tech.category)!.push(tech.name);
      }
      for (const [category, techs] of categories) {
        lines.push(`- **${category}:** ${techs.join(', ')}`);
      }
      lines.push('');
    }

    // Hiring
    if (data.hiring && data.hiring.openPositions > 0) {
      lines.push('## Hiring');
      lines.push('');
      lines.push(`**Open Positions:** ${data.hiring.openPositions}`);
      lines.push('');
      const depts = data.hiring.departmentHiring;
      const activeDepts = Object.entries(depts).filter(([, v]) => v > 0);
      if (activeDepts.length > 0) {
        lines.push('| Department | Open Roles |');
        lines.push('|------------|------------|');
        for (const [dept, count] of activeDepts) {
          const label = dept.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
          lines.push(`| ${label} | ${count} |`);
        }
        lines.push('');
      }
      if (data.hiring.topSkillsHiring.length > 0) {
        lines.push(`**Top Skills:** ${data.hiring.topSkillsHiring.join(', ')}`);
        lines.push('');
      }
    }

    // GitHub
    if (data.githubActivity) {
      lines.push('## GitHub');
      lines.push('');
      lines.push(`| Metric | Value |`);
      lines.push(`|--------|-------|`);
      lines.push(`| Public Repos | ${data.githubActivity.publicRepos} |`);
      lines.push(`| Total Stars | ${data.githubActivity.totalStars.toLocaleString()} |`);
      if (data.githubActivity.programmingLanguages.length > 0) {
        lines.push(`| Languages | ${data.githubActivity.programmingLanguages.join(', ')} |`);
      }
      lines.push('');
      if (data.githubActivity.topRepos.length > 0) {
        lines.push('**Top Repos:**');
        for (const repo of data.githubActivity.topRepos) {
          lines.push(`- [${repo.name}](${repo.url}) — ${repo.stars.toLocaleString()} stars (${repo.language})`);
        }
        lines.push('');
      }
    }

    // Mobile Apps
    if (data.mobileApps && (data.mobileApps.hasIosApp || data.mobileApps.hasAndroidApp)) {
      lines.push('## Mobile Apps');
      lines.push('');
      if (data.mobileApps.hasIosApp) {
        for (const app of data.mobileApps.iosApps) {
          lines.push(`- **iOS:** [${app.appName}](${app.appUrl})`);
        }
      }
      if (data.mobileApps.hasAndroidApp) {
        for (const app of data.mobileApps.androidApps) {
          lines.push(`- **Android:** [${app.appName}](${app.appUrl})`);
        }
      }
      lines.push('');
    }

    // Social Links
    const socialLinks = [
      data.linkedinUrl && `[LinkedIn](${data.linkedinUrl})`,
      data.twitterUrl && `[Twitter/X](${data.twitterUrl})`,
      data.githubUrl && `[GitHub](${data.githubUrl})`,
    ].filter(Boolean);

    if (socialLinks.length > 0) {
      lines.push('## Links');
      lines.push('');
      lines.push(socialLinks.join(' · '));
      lines.push('');
    }

    // AI Insights
    if (data.aiInsights) {
      if (data.aiInsights.recentNews && data.aiInsights.recentNews.length > 0) {
        lines.push('## Recent News');
        lines.push('');
        for (const news of data.aiInsights.recentNews) {
          lines.push(`- ${news}`);
        }
        lines.push('');
      }
      if (data.aiInsights.competitorMoves && data.aiInsights.competitorMoves.length > 0) {
        lines.push('## Competitor Activity');
        lines.push('');
        for (const move of data.aiInsights.competitorMoves) {
          lines.push(`- **${move.competitor}:** ${move.event}${move.impact ? ` — _${move.impact}_` : ''}`);
        }
        lines.push('');
      }
    }

    // Metadata
    lines.push('---');
    lines.push(`_Enriched on ${new Date(data.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · Data quality: ${data.dataQuality} · Sources: ${data.sources.join(', ')}_`);
    lines.push('');

    return lines.join('\n');
  }

  async exportSingle(data: CompanyEnrichmentData): Promise<string> {
    await this.ensureOutputDir();
    const filename = `${data.domain.replace(/[^a-z0-9]/gi, '-')}.md`;
    const filepath = path.join(this.outputDir, filename);
    const content = this.formatCompany(data);
    await fs.writeFile(filepath, content, 'utf-8');
    return filepath;
  }

  async exportBatch(results: CompanyEnrichmentData[]): Promise<string> {
    await this.ensureOutputDir();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `enrichment-${timestamp}.md`;
    const filepath = path.join(this.outputDir, filename);

    const sections: string[] = [];
    sections.push(`# Company Enrichment Report`);
    sections.push(`_Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · ${results.length} companies_`);
    sections.push('');
    sections.push('## Table of Contents');
    sections.push('');
    for (const data of results) {
      const anchor = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      sections.push(`- [${data.name}](#${anchor})`);
    }
    sections.push('');
    sections.push('---');
    sections.push('');

    for (const data of results) {
      sections.push(this.formatCompany(data));
      sections.push('---');
      sections.push('');
    }

    await fs.writeFile(filepath, sections.join('\n'), 'utf-8');
    return filepath;
  }
}
