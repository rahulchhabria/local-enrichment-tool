# Local Enrichment Tool

AI-powered company enrichment tool. Give it any domain and get back a detailed company profile with firmographic, technographic, and hiring data — exported as clean Markdown files.

Built with Claude (via Vercel AI SDK), runs entirely on your machine.

## What It Does

Point it at a company domain and it will:

- **Scrape the company website** for basic info, social links, and tech stack detection
- **Pull GitHub data** — repos, stars, languages, activity
- **Scrape job boards** (Greenhouse, Lever, Ashby) for open positions and hiring signals
- **Detect mobile apps** from App Store / Play Store links
- **Estimate engineering headcount** from multiple signals
- **Use Claude AI** to synthesize everything into structured data with competitive insights

The output is a well-formatted Markdown report you can read, share, or feed into other tools.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up your API key
cp .env.example .env
# Edit .env and add your Anthropic API key
# Get one at https://console.anthropic.com

# 3. Build the project
npm run build

# 4. Run the web UI
npm run dev
# Open http://localhost:3000
```

📖 **New to this tool?** Read the full guide: [GETTING_STARTED.md](./GETTING_STARTED.md)

## Usage

### Web UI

```bash
npm run dev
```

Opens a local web interface at `http://localhost:3000`. Paste one or more domains (one per line), click Enrich, and get results instantly. The UI has a Mac-native feel with live Markdown preview.

### CLI

```bash
# Single domain
npm run enrich -- stripe.com

# Multiple domains
npm run enrich -- stripe.com anthropic.com vercel.com

# From a file (one domain per line)
npm run enrich -- --file domains.txt
```

Results are saved as `.md` files in the `./output/` directory.

## Desktop App (Optional)

Want a native macOS app instead of running in your browser?

### Build the Desktop App

```bash
# Install Electron dependencies (first time only)
npm install

# Build the .app bundle
npm run electron:build

# Or build a universal binary (Intel + Apple Silicon)
npm run electron:dist
```

The app will be in `release/mac/` - drag it to your Applications folder.

### Run in Development Mode

```bash
npm run electron:dev
```

This builds the project and launches the Electron app with DevTools enabled.

### How It Works

The desktop app:
- Runs the same Express server as the web version
- Opens it in a native macOS window
- Uses your existing `.env` configuration
- Exports files to the same `output/` directory

**Note:** The web server (`npm run dev`) still works exactly as before - Electron is purely optional.

📖 **Learn more:** [ELECTRON.md](./ELECTRON.md) for detailed Electron documentation.

## Configuration

Copy `.env.example` to `.env` and set:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key ([get one here](https://console.anthropic.com)) |
| `GITHUB_TOKEN` | No | GitHub personal access token — increases API rate limits from 60 to 5,000 requests/hour |
| `PORT` | No | Server port (default: `3000`) |

## What's in a Report

Each enrichment report includes (when available):

- **Company overview** — name, description, founded year, employee count, HQ location
- **Funding history** — rounds, amounts, investors, valuations
- **Leadership** — CEO, founders, recent leadership changes
- **Tech stack** — frontend/backend frameworks, databases, cloud providers, analytics, payments, auth, CDN
- **Hiring data** — open positions by department, top skills being hired for, individual job listings
- **GitHub activity** — public repos, stars, forks, programming languages, top repositories
- **Mobile apps** — iOS and Android app detection
- **AI insights** — growth stage, competitive landscape, key differentiators, recent news

## Project Structure

```
src/
  index.ts                  # Express server + web UI
  scripts/
    enrich.ts               # CLI entry point
  lib/
    enrichment-engine.ts    # Core orchestrator — coordinates all data sources + AI
    tech-detector.ts        # Detects tech stack from HTML
    job-scraper.ts          # Scrapes Greenhouse, Lever, Ashby job boards
    github-fetcher.ts       # GitHub API integration
    linkedin-headcount.ts   # Engineering headcount estimation
    mobile-app-detector.ts  # iOS/Android app detection from HTML
    markdown-exporter.ts    # Formats enrichment data as Markdown
  types/
    enrichment.ts           # TypeScript interfaces for all data structures
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **AI**: Claude via [Vercel AI SDK](https://sdk.vercel.ai) + [@ai-sdk/anthropic](https://www.npmjs.com/package/@ai-sdk/anthropic)
- **Web scraping**: Axios + Cheerio
- **Server**: Express (serves both the API and the web UI)
- **Validation**: Zod (structured AI output)

## License

MIT
