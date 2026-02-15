# Getting Started - Local Enrichment Tool

Complete guide to running this tool locally on your machine.

---

## Prerequisites

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Anthropic API Key** (required) - [Get one here](https://console.anthropic.com)
- **GitHub Token** (optional but recommended) - [Get one here](https://github.com/settings/tokens)

### Check if you have Node.js installed:

```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
```

If not installed, download from [nodejs.org](https://nodejs.org/)

---

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Navigate to the project directory
cd local-enrichment-tool

# Install all required packages
npm install
```

This installs:
- Express (web server)
- Anthropic SDK + Vercel AI SDK (for Claude)
- Axios + Cheerio (web scraping)
- TypeScript + tsx (development)

### 2. Get Your Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)
6. **Important**: Save it somewhere safe - you can only see it once!

### 3. (Optional) Get a GitHub Token

This increases your GitHub API rate limit from 60 to 5,000 requests/hour.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **Generate new token (classic)**
3. Give it a name like "Local Enrichment Tool"
4. Select scopes: **public_repo** (read access to public repos)
5. Click **Generate token**
6. Copy the token (starts with `ghp_` or `github_pat_`)

### 4. Create Your `.env` File

```bash
# Copy the example file
cp .env.example .env

# Open it in your favorite editor
nano .env
# or: code .env
# or: vim .env
```

Add your API keys:

```bash
# Required: Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# Optional: GitHub personal access token (increases rate limits)
GITHUB_TOKEN=ghp_your_github_token_here

# Optional: Server port (default: 3000)
PORT=3000
```

**Save and close the file.**

### 5. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

---

## Running the Tool

### Option A: Web UI (Recommended)

Start the local web server:

```bash
npm run dev
```

You should see:

```
  Local Enrichment Tool
  http://localhost:3000
```

Open your browser to **http://localhost:3000**

**Using the Web UI:**
1. Enter one or more domains (one per line)
2. Click **Enrich** (or press Cmd+Enter / Ctrl+Enter)
3. Wait 30-60 seconds per domain
4. View results and download Markdown reports

### Option B: CLI (Command Line)

Enrich a single domain:

```bash
npm run enrich -- stripe.com
```

Enrich multiple domains:

```bash
npm run enrich -- stripe.com anthropic.com vercel.com
```

Enrich from a file (one domain per line):

```bash
# Create a file with domains
echo "stripe.com" >> domains.txt
echo "anthropic.com" >> domains.txt
echo "linear.app" >> domains.txt

# Run enrichment
npm run enrich -- --file domains.txt
```

**Output**: Reports are saved to `./output/` as Markdown files.

---

## Testing It Works

### Quick Test

Try enriching a well-known company:

```bash
npm run enrich -- stripe.com
```

You should see output like:

```
Enriching company: stripe.com
  ✓ Website fetched (8234 chars)
  ✓ Crunchbase data fetched
  → Fetching GitHub data for: stripe
  ✓ Found 52 repos, 12453 stars
  → Scraping jobs from Greenhouse...
  ✓ Found 23 open positions
  → Detecting mobile apps...
  ✓ Found 2 mobile app(s)
  → Analyzing data with AI...

Done! Report saved to: ./output/stripe-com-2026-02-15.md
Confidence: 95% · Time: 45.2s
```

### View the Output

```bash
# List generated reports
ls -lh output/

# View a report
cat output/stripe-com-*.md
```

---

## What Gets Enriched?

For each company domain, the tool gathers:

✅ **Firmographic Data**
- Company name, description, founded year
- Employee count and headquarters
- Funding history (rounds, amounts, investors)
- Leadership (CEO, founders)

✅ **Technographic Data**
- Tech stack (frontend/backend frameworks)
- Databases, cloud providers, analytics tools
- Payment processors, auth providers, CDN

✅ **Hiring Signals**
- Open positions by department
- Top skills being hired for
- Individual job listings with links

✅ **GitHub Activity**
- Public repos, stars, forks
- Programming languages used
- Top repositories and recent activity

✅ **Mobile Apps**
- iOS App Store detection
- Android Play Store detection

✅ **AI Insights**
- Growth stage analysis
- Competitive landscape
- Key differentiators
- Recent news and product launches

---

## Troubleshooting

### "ANTHROPIC_API_KEY is not configured"

**Problem**: API key not loaded

**Solution**:
```bash
# Check if .env file exists
ls -la .env

# Check if it has your key
cat .env | grep ANTHROPIC_API_KEY

# Make sure it's not the placeholder value
# Should be: ANTHROPIC_API_KEY=sk-ant-api03-...
# NOT: ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### "Port 3000 is already in use"

**Problem**: Another app is using port 3000

**Solution**: Change the port in `.env`:
```bash
PORT=3001
```

Then restart: `npm run dev`

### "Rate limit exceeded" (GitHub)

**Problem**: Hit GitHub's 60 requests/hour limit

**Solution**: Add a GitHub token to your `.env` file (see Step 3 above)

### "Module not found" errors

**Problem**: Dependencies not installed

**Solution**:
```bash
rm -rf node_modules
npm install
npm run build
```

### Slow performance

**Tips**:
- Enriching takes 30-60 seconds per domain (this is normal)
- Processing happens in parallel for batch requests
- Some sites block scrapers (they'll show as "failed")
- LinkedIn rate limits may affect headcount data

---

## What's Next?

### Batch Enrichment

Create a file with domains you want to enrich:

```bash
# domains.txt
stripe.com
anthropic.com
linear.app
figma.com
notion.so
vercel.com
```

Run batch enrichment:

```bash
npm run enrich -- --file domains.txt
```

### Customize the Output

Edit `src/lib/markdown-exporter.ts` to change the Markdown format.

### Add More Data Sources

The enrichment engine is modular. Add new data sources in `src/lib/enrichment-engine.ts`.

### API Rate Limits

- **Anthropic**: Check your plan limits at [console.anthropic.com](https://console.anthropic.com)
- **GitHub**: 60/hour (no token) or 5,000/hour (with token)
- **Public websites**: Varies by site (some block scrapers)

---

## Security Reminders

🔒 **Never commit your `.env` file**
🔒 **Don't share API keys in issues or PRs**
🔒 **Rotate keys if accidentally exposed**
🔒 **Keep your API keys secure**

See [SECURITY.md](./SECURITY.md) for more details.

---

## Need Help?

- **Check logs**: The CLI shows detailed progress
- **Review output**: Check `./output/` for generated reports
- **Open an issue**: [GitHub Issues](../../issues)
- **Read the code**: Start with `src/index.ts` and `src/lib/enrichment-engine.ts`

---

## Example Workflow

```bash
# 1. Setup (one time)
npm install
cp .env.example .env
# Edit .env with your API key
npm run build

# 2. Start web UI
npm run dev
# Open http://localhost:3000

# 3. Or use CLI
npm run enrich -- anthropic.com

# 4. View results
ls output/
cat output/anthropic-com-*.md
```

That's it! You're ready to start enriching company data. 🚀
