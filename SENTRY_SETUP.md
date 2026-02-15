# Sentry Setup Guide

Sentry provides error tracking, performance monitoring, and debugging for your enrichment tool.

## Why Use Sentry?

- 🐛 **Error Tracking** - Catch and debug errors in production
- ⚡ **Performance Monitoring** - Track slow enrichments and bottlenecks
- 📊 **Context** - See which domains failed and why
- 🔔 **Alerts** - Get notified when things break

## Setup (5 minutes)

### 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up (free tier is generous)
3. Create a new project
   - Platform: **Node.js**
   - Alert frequency: Your preference

### 2. Get Your DSN

After creating the project, Sentry will show you a DSN (Data Source Name):

```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

Copy this - you'll need it next.

### 3. Add DSN to .env

```bash
# Edit your .env file
nano .env

# Add this line (replace with your actual DSN):
SENTRY_DSN=https://abc123def456@o123456.ingest.sentry.io/7890123
```

### 4. Restart the Server

```bash
# If running in dev mode, it will auto-restart
# Or manually restart:
npm run dev
```

That's it! Sentry is now active. 🎉

---

## Testing It Works

### Option A: Trigger a Test Error

```bash
# Try enriching an invalid domain
curl -X POST http://localhost:3000/api/enrich \
  -H "Content-Type: application/json" \
  -d '{"domains":["invalid-domain-that-does-not-exist.fake"]}'
```

Check Sentry - you should see the error appear within seconds.

### Option B: Check Sentry Dashboard

1. Go to your Sentry project dashboard
2. Try enriching a company via the web UI
3. Watch transactions appear in Sentry

---

## What Gets Tracked?

### Server Side (Node.js)

**Errors:**
- API endpoint failures
- Enrichment failures
- Network errors
- AI generation errors

**Context Included:**
- Domain being enriched
- Number of domains in batch
- Success/fail counts
- Processing time

### Browser Side (optional)

The web UI also has Sentry enabled for:
- JavaScript errors in the UI
- Network failures
- Session replay (see what user was doing when error occurred)

**To disable browser Sentry:**
Remove the Sentry script tag from `src/index.ts` (around line 92)

---

## Optional: Disable Sentry

If you don't want Sentry, just remove the DSN from your `.env` file:

```bash
# .env
SENTRY_DSN=
```

The app works perfectly fine without Sentry - all calls are optional.

---

## Performance Tracking

Sentry tracks these operations:

1. **enrichCompany** - Overall enrichment for one domain
2. **enrichBatch** - Batch enrichment
3. **fetchWebsite** - Website scraping time
4. **fetchGitHub** - GitHub API calls
5. **scrapeJobs** - Job board scraping
6. **detectTechStack** - Tech detection
7. **detectMobileApps** - Mobile app detection
8. **extractWithAI** - Claude AI processing

View these in: **Sentry Dashboard → Performance**

---

## Troubleshooting

### "Events are not appearing in Sentry"

**Check:**
1. Is `SENTRY_DSN` set in your `.env`?
   ```bash
   cat .env | grep SENTRY_DSN
   ```

2. Did you restart the server after adding the DSN?
   ```bash
   npm run dev
   ```

3. Is the DSN correct? (should start with `https://`)

### "Too many events being sent"

Sentry's free tier includes:
- 5,000 errors/month
- 10,000 transactions/month

If you're hitting limits:
- Lower `tracesSampleRate` in `src/index.ts` (default: 1.0 = 100%)
- Upgrade to a paid plan
- Disable performance monitoring (keep only errors)

### "Want to see what data is being sent?"

Check Sentry's breadcrumbs feature - it shows the full request/response cycle.

---

## Advanced Configuration

### Custom Sample Rates

Edit `src/index.ts`:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 0.1,  // Track 10% of transactions (saves quota)
});
```

### Different Environments

```bash
# .env
NODE_ENV=production
SENTRY_DSN=your-dsn-here
```

Sentry will tag events with the environment.

### Add Release Tracking

```bash
# package.json
"version": "1.0.0"
```

Sentry will track which version had errors.

---

## Cost

**Free Tier:**
- 5,000 errors/month
- 10,000 performance transactions/month
- 1 team member
- 30-day history

**Paid Plans:**
- Start at $26/month
- More events, longer history, more features

For a personal enrichment tool, **free tier is plenty**.

---

## Support

- [Sentry Docs](https://docs.sentry.io/)
- [Node.js Setup](https://docs.sentry.io/platforms/node/)
- [Express Integration](https://docs.sentry.io/platforms/node/guides/express/)
