import dotenv from 'dotenv';
dotenv.config();

import { CompanyEnrichmentEngine } from '../lib/enrichment-engine.js';
import { MarkdownExporter } from '../lib/markdown-exporter.js';
import fs from 'fs/promises';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
  Local Enrichment Tool — CLI

  Usage:
    npx tsx src/scripts/enrich.ts <domain>              Enrich a single domain
    npx tsx src/scripts/enrich.ts <domain1> <domain2>   Enrich multiple domains
    npx tsx src/scripts/enrich.ts --file <path.txt>     Enrich from a file (one domain per line)

  Examples:
    npx tsx src/scripts/enrich.ts stripe.com
    npx tsx src/scripts/enrich.ts anthropic.com linear.app figma.com
    npx tsx src/scripts/enrich.ts --file domains.txt

  Output is saved to ./output/ as Markdown files.
`);
    process.exit(0);
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.error('\n  Error: ANTHROPIC_API_KEY is not set.');
    console.error('  Copy .env.example to .env and add your key:\n');
    console.error('    cp .env.example .env\n');
    process.exit(1);
  }

  let domains: string[] = [];

  if (args[0] === '--file') {
    const filePath = args[1];
    if (!filePath) {
      console.error('  Error: Please provide a file path after --file');
      process.exit(1);
    }
    const content = await fs.readFile(filePath, 'utf-8');
    domains = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
  } else {
    domains = args;
  }

  if (domains.length === 0) {
    console.error('  Error: No domains provided.');
    process.exit(1);
  }

  const engine = new CompanyEnrichmentEngine();
  const exporter = new MarkdownExporter();

  console.log(`\n  Enriching ${domains.length} domain${domains.length > 1 ? 's' : ''}...\n`);

  if (domains.length === 1) {
    const result = await engine.enrichCompany({ domain: domains[0] });

    if (result.success && result.data) {
      const filepath = await exporter.exportSingle(result.data);
      console.log(`\n  Done! Report saved to: ${filepath}`);
      console.log(`  Confidence: ${result.confidence}% · Time: ${(result.processingTimeMs / 1000).toFixed(1)}s\n`);
    } else {
      console.error(`\n  Failed to enrich ${domains[0]}: ${result.error}\n`);
      process.exit(1);
    }
  } else {
    const inputs = domains.map(domain => ({ domain }));
    const results = await engine.enrichBatch(inputs);
    const successfulData = results
      .filter(r => r.success && r.data)
      .map(r => r.data!);

    if (successfulData.length > 0) {
      const filepath = await exporter.exportBatch(successfulData);
      console.log(`\n  Done! Report saved to: ${filepath}`);
      console.log(`  ${successfulData.length}/${domains.length} enriched successfully\n`);
    }

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.log('  Failed domains:');
      failed.forEach((r, i) => console.log(`    - ${domains[results.indexOf(r)]}: ${r.error}`));
      console.log('');
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
