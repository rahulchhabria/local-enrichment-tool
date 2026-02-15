# Security Policy

## API Keys and Secrets

This project requires API keys to function. **NEVER commit API keys to version control.**

### Required API Keys

1. **Anthropic API Key** (required)
   - Get yours at: https://console.anthropic.com
   - Store in `.env` file as `ANTHROPIC_API_KEY`

2. **GitHub Token** (optional, but recommended)
   - Get yours at: https://github.com/settings/tokens
   - Store in `.env` file as `GITHUB_TOKEN`
   - Increases rate limits from 60 to 5,000 requests/hour

### Safe Setup

```bash
# 1. Copy the example environment file
cp .env.example .env

# 2. Edit .env and add your API keys
# Use your favorite editor: nano, vim, code, etc.
nano .env

# 3. Verify .env is in .gitignore (it should be!)
cat .gitignore | grep .env
```

### Best Practices

- ✅ Always use environment variables for secrets
- ✅ Never hardcode API keys in source code
- ✅ Keep `.env` in `.gitignore`
- ✅ Use `.env.example` for documentation (with fake values)
- ✅ Rotate your API keys if accidentally committed
- ❌ Never commit `.env` files
- ❌ Never share API keys in issues, PRs, or Discord

### What If I Accidentally Commit an API Key?

1. **Immediately rotate/delete the key** from your provider
2. Remove the commit from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push to overwrite remote history (if already pushed)
4. Generate a new API key

## Reporting a Vulnerability

If you discover a security vulnerability, please:
1. **Do NOT** open a public issue
2. Email the maintainer directly (see GitHub profile)
3. Include detailed information about the vulnerability
4. Allow time for a fix before public disclosure

## Scope

This tool runs entirely locally. No data is sent to any servers except:
- Anthropic API (for AI processing)
- Public websites being enriched
- GitHub API (if token provided)
- LinkedIn/Crunchbase public pages

We do not:
- Store your data on remote servers
- Collect telemetry or analytics
- Share data with third parties
