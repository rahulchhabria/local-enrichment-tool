/**
 * Tech Stack Detection
 * Analyzes HTML/JS to detect frontend/backend frameworks and tools
 */

export interface TechStack {
  name: string;
  category: string;
  confidence: number; // 0-100
  version?: string;
}

export interface TechnographicData {
  frontendFrameworks: TechStack[];
  backendFrameworks: TechStack[];
  databases: TechStack[];
  cloudProviders: TechStack[];
  analyticsTools: TechStack[];
  observabilityStack: TechStack[];
  marketingTools: TechStack[];
  paymentProcessors: TechStack[];
  customerSupport: TechStack[];
  cdnProviders: TechStack[];
  authProviders: TechStack[];
  apiServices: TechStack[];
  allTechnologies: TechStack[];
}

export class TechDetector {
  /**
   * Extract all script sources from HTML
   */
  private extractScriptSources(html: string): string[] {
    const scriptRegex = /<script[^>]*src=["']([^"']+)["']/gi;
    const sources: string[] = [];
    let match;

    while ((match = scriptRegex.exec(html)) !== null) {
      sources.push(match[1].toLowerCase());
    }

    return sources;
  }

  /**
   * Detect tech stack from website HTML
   */
  async detectTechStack(html: string, url: string): Promise<TechnographicData> {
    const detected: TechStack[] = [];

    // Extract all script sources
    const scriptSrcs = this.extractScriptSources(html);

    // Frontend Frameworks
    if (html.includes('react') || html.includes('_react') || html.includes('React') || scriptSrcs.some(s => s.includes('react'))) {
      detected.push({ name: 'React', category: 'Frontend Framework', confidence: 90 });
    }
    if (html.includes('vue') || html.includes('Vue.js') || scriptSrcs.some(s => s.includes('vue'))) {
      detected.push({ name: 'Vue.js', category: 'Frontend Framework', confidence: 90 });
    }
    if (html.includes('angular') || html.includes('ng-') || scriptSrcs.some(s => s.includes('angular'))) {
      detected.push({ name: 'Angular', category: 'Frontend Framework', confidence: 90 });
    }
    if (html.includes('svelte') || scriptSrcs.some(s => s.includes('svelte'))) {
      detected.push({ name: 'Svelte', category: 'Frontend Framework', confidence: 85 });
    }
    if (html.includes('next.js') || html.includes('_next') || scriptSrcs.some(s => s.includes('_next'))) {
      detected.push({ name: 'Next.js', category: 'Frontend Framework', confidence: 95 });
    }

    // Build Tools
    if (html.includes('webpack') || scriptSrcs.some(s => s.includes('webpack'))) {
      detected.push({ name: 'Webpack', category: 'Build Tool', confidence: 80 });
    }
    if (html.includes('vite') || scriptSrcs.some(s => s.includes('vite'))) {
      detected.push({ name: 'Vite', category: 'Build Tool', confidence: 80 });
    }

    // Analytics
    if (html.includes('google-analytics') || html.includes('gtag') || html.includes('ga.js') || scriptSrcs.some(s => s.includes('googletagmanager') || s.includes('google-analytics'))) {
      detected.push({ name: 'Google Analytics', category: 'Analytics', confidence: 95 });
    }
    if (html.includes('segment.com') || html.includes('analytics.js') || scriptSrcs.some(s => s.includes('segment.com') || s.includes('segment.io'))) {
      detected.push({ name: 'Segment', category: 'Analytics', confidence: 95 });
    }
    if (html.includes('mixpanel') || scriptSrcs.some(s => s.includes('mixpanel'))) {
      detected.push({ name: 'Mixpanel', category: 'Analytics', confidence: 90 });
    }
    if (html.includes('amplitude') || scriptSrcs.some(s => s.includes('amplitude'))) {
      detected.push({ name: 'Amplitude', category: 'Analytics', confidence: 90 });
    }
    if (html.includes('plausible') || scriptSrcs.some(s => s.includes('plausible'))) {
      detected.push({ name: 'Plausible', category: 'Analytics', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('posthog'))) {
      detected.push({ name: 'PostHog', category: 'Analytics', confidence: 90 });
    }

    // Observability & Monitoring - Enhanced Detection

    // Sentry
    if (html.includes('sentry') || html.includes('sentry.io') ||
        scriptSrcs.some(s => s.includes('sentry')) ||
        html.includes('Sentry.init') || html.includes('Sentry.captureException')) {
      detected.push({ name: 'Sentry', category: 'Observability', confidence: 95 });
    }

    // Datadog RUM
    if (html.includes('datadog') || scriptSrcs.some(s => s.includes('datadog')) ||
        html.includes('DD_RUM') || html.includes('datadoghq') ||
        scriptSrcs.some(s => s.includes('datadoghq-browser')) ||
        html.includes('datadoghq.com/browser') || html.includes('DD_LOGS')) {
      detected.push({ name: 'Datadog', category: 'Observability', confidence: 95 });
    }

    // New Relic
    if (html.includes('newrelic') || html.includes('nr-data') ||
        scriptSrcs.some(s => s.includes('newrelic')) ||
        html.includes('NREUM') || html.includes('bam.nr-data.net') ||
        scriptSrcs.some(s => s.includes('js-agent.newrelic.com')) ||
        html.includes('window.NREUM')) {
      detected.push({ name: 'New Relic', category: 'Observability', confidence: 95 });
    }

    // LogRocket
    if (html.includes('logrocket') || scriptSrcs.some(s => s.includes('logrocket')) ||
        html.includes('LogRocket.init') || html.includes('cdn.logrocket.com')) {
      detected.push({ name: 'LogRocket', category: 'Observability', confidence: 90 });
    }

    // FullStory
    if (scriptSrcs.some(s => s.includes('fullstory')) ||
        html.includes('fullstory.com') || html.includes('_fs_')) {
      detected.push({ name: 'FullStory', category: 'Observability', confidence: 90 });
    }

    // AppDynamics
    if (html.includes('appdynamics') || scriptSrcs.some(s => s.includes('appdynamics')) ||
        html.includes('adrum') || scriptSrcs.some(s => s.includes('adrum.js'))) {
      detected.push({ name: 'AppDynamics', category: 'Observability', confidence: 90 });
    }

    // Dynatrace
    if (html.includes('dynatrace') || scriptSrcs.some(s => s.includes('dynatrace')) ||
        html.includes('ruxitagentjs') || scriptSrcs.some(s => s.includes('bf.dynatrace.com'))) {
      detected.push({ name: 'Dynatrace', category: 'Observability', confidence: 90 });
    }

    // Splunk RUM
    if (html.includes('splunk') || scriptSrcs.some(s => s.includes('splunk')) ||
        scriptSrcs.some(s => s.includes('splunkrum'))) {
      detected.push({ name: 'Splunk RUM', category: 'Observability', confidence: 85 });
    }

    // Elastic APM
    if (html.includes('elastic-apm') || scriptSrcs.some(s => s.includes('elastic-apm')) ||
        html.includes('@elastic/apm-rum')) {
      detected.push({ name: 'Elastic APM', category: 'Observability', confidence: 90 });
    }

    // Raygun
    if (html.includes('raygun') || scriptSrcs.some(s => s.includes('raygun')) ||
        html.includes('rg4js')) {
      detected.push({ name: 'Raygun', category: 'Observability', confidence: 85 });
    }

    // Bugsnag
    if (html.includes('bugsnag') || scriptSrcs.some(s => s.includes('bugsnag')) ||
        html.includes('Bugsnag.start')) {
      detected.push({ name: 'Bugsnag', category: 'Observability', confidence: 90 });
    }

    // Rollbar
    if (html.includes('rollbar') || scriptSrcs.some(s => s.includes('rollbar')) ||
        html.includes('Rollbar.init')) {
      detected.push({ name: 'Rollbar', category: 'Observability', confidence: 90 });
    }

    // Honeybadger
    if (html.includes('honeybadger') || scriptSrcs.some(s => s.includes('honeybadger'))) {
      detected.push({ name: 'Honeybadger', category: 'Observability', confidence: 85 });
    }

    // Airbrake
    if (html.includes('airbrake') || scriptSrcs.some(s => s.includes('airbrake'))) {
      detected.push({ name: 'Airbrake', category: 'Observability', confidence: 85 });
    }

    // Highlight.io
    if (html.includes('highlight.io') || scriptSrcs.some(s => s.includes('highlight.io')) ||
        html.includes('H.init')) {
      detected.push({ name: 'Highlight.io', category: 'Observability', confidence: 90 });
    }

    // OpenTelemetry
    if (html.includes('opentelemetry') || html.includes('@opentelemetry') ||
        scriptSrcs.some(s => s.includes('opentelemetry'))) {
      detected.push({ name: 'OpenTelemetry', category: 'Observability', confidence: 85 });
    }

    // Prometheus (client-side metrics)
    if (html.includes('prometheus') || scriptSrcs.some(s => s.includes('prometheus'))) {
      detected.push({ name: 'Prometheus', category: 'Observability', confidence: 80 });
    }

    // Grafana Faro (RUM)
    if (html.includes('@grafana/faro') || scriptSrcs.some(s => s.includes('grafana-faro'))) {
      detected.push({ name: 'Grafana Faro', category: 'Observability', confidence: 85 });
    }

    // Instana
    if (html.includes('instana') || scriptSrcs.some(s => s.includes('instana')) ||
        html.includes('ineum')) {
      detected.push({ name: 'Instana', category: 'Observability', confidence: 85 });
    }

    // Honeycomb.io
    if (html.includes('honeycomb.io') || scriptSrcs.some(s => s.includes('honeycomb'))) {
      detected.push({ name: 'Honeycomb', category: 'Observability', confidence: 85 });
    }

    // Lightstep (now ServiceNow Cloud Observability)
    if (html.includes('lightstep') || scriptSrcs.some(s => s.includes('lightstep'))) {
      detected.push({ name: 'Lightstep', category: 'Observability', confidence: 85 });
    }

    // Atatus
    if (html.includes('atatus') || scriptSrcs.some(s => s.includes('atatus'))) {
      detected.push({ name: 'Atatus', category: 'Observability', confidence: 80 });
    }

    // Scout APM
    if (html.includes('scoutapm') || scriptSrcs.some(s => s.includes('scoutapm'))) {
      detected.push({ name: 'Scout APM', category: 'Observability', confidence: 80 });
    }

    // Better Stack (formerly Logtail)
    if (html.includes('betterstack') || scriptSrcs.some(s => s.includes('betterstack')) ||
        html.includes('logtail')) {
      detected.push({ name: 'Better Stack', category: 'Observability', confidence: 85 });
    }

    // Checkly (Monitoring as Code)
    if (html.includes('checklyhq') || scriptSrcs.some(s => s.includes('checkly'))) {
      detected.push({ name: 'Checkly', category: 'Observability', confidence: 80 });
    }

    // Payment Processors
    if (html.includes('stripe') || scriptSrcs.some(s => s.includes('stripe.com'))) {
      detected.push({ name: 'Stripe', category: 'Payment Processor', confidence: 95 });
    }
    if (scriptSrcs.some(s => s.includes('paypal.com'))) {
      detected.push({ name: 'PayPal', category: 'Payment Processor', confidence: 95 });
    }
    if (scriptSrcs.some(s => s.includes('braintree'))) {
      detected.push({ name: 'Braintree', category: 'Payment Processor', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('square'))) {
      detected.push({ name: 'Square', category: 'Payment Processor', confidence: 90 });
    }

    // Customer Support
    if (html.includes('intercom') || scriptSrcs.some(s => s.includes('intercom'))) {
      detected.push({ name: 'Intercom', category: 'Customer Support', confidence: 95 });
    }
    if (html.includes('zendesk') || scriptSrcs.some(s => s.includes('zendesk'))) {
      detected.push({ name: 'Zendesk', category: 'Customer Support', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('helpscout'))) {
      detected.push({ name: 'Help Scout', category: 'Customer Support', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('crisp.chat'))) {
      detected.push({ name: 'Crisp', category: 'Customer Support', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('tawk.to'))) {
      detected.push({ name: 'Tawk.to', category: 'Customer Support', confidence: 90 });
    }

    // Marketing & Sales Tools
    if (html.includes('hubspot') || scriptSrcs.some(s => s.includes('hubspot'))) {
      detected.push({ name: 'HubSpot', category: 'Marketing', confidence: 90 });
    }
    if (html.includes('drift') || scriptSrcs.some(s => s.includes('drift'))) {
      detected.push({ name: 'Drift', category: 'Marketing', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('pardot'))) {
      detected.push({ name: 'Pardot', category: 'Marketing', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('marketo'))) {
      detected.push({ name: 'Marketo', category: 'Marketing', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('optimizely'))) {
      detected.push({ name: 'Optimizely', category: 'Marketing', confidence: 85 });
    }

    // Auth Providers
    if (scriptSrcs.some(s => s.includes('auth0'))) {
      detected.push({ name: 'Auth0', category: 'Authentication', confidence: 95 });
    }
    if (scriptSrcs.some(s => s.includes('okta'))) {
      detected.push({ name: 'Okta', category: 'Authentication', confidence: 95 });
    }
    if (html.includes('firebase') || scriptSrcs.some(s => s.includes('firebase'))) {
      detected.push({ name: 'Firebase', category: 'Authentication', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('clerk.dev') || s.includes('clerk.com'))) {
      detected.push({ name: 'Clerk', category: 'Authentication', confidence: 95 });
    }

    // CDN Providers
    if (html.includes('cloudfront.net') || scriptSrcs.some(s => s.includes('cloudfront.net'))) {
      detected.push({ name: 'CloudFront', category: 'CDN', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('cloudflare'))) {
      detected.push({ name: 'Cloudflare', category: 'CDN', confidence: 90 });
    }
    if (scriptSrcs.some(s => s.includes('fastly'))) {
      detected.push({ name: 'Fastly', category: 'CDN', confidence: 90 });
    }

    // Cloud Providers
    if (html.includes('cloudfront.net') || html.includes('amazonaws.com')) {
      detected.push({ name: 'AWS', category: 'Cloud Provider', confidence: 85 });
    }
    if (html.includes('storage.googleapis.com') || html.includes('gcp')) {
      detected.push({ name: 'Google Cloud', category: 'Cloud Provider', confidence: 85 });
    }
    if (html.includes('azure') || html.includes('azurewebsites')) {
      detected.push({ name: 'Azure', category: 'Cloud Provider', confidence: 85 });
    }
    if (html.includes('vercel') || html.includes('vercel.app')) {
      detected.push({ name: 'Vercel', category: 'Cloud Provider', confidence: 95 });
    }
    if (html.includes('netlify')) {
      detected.push({ name: 'Netlify', category: 'Cloud Provider', confidence: 95 });
    }

    // Check headers for additional signals
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });

      const server = response.headers.get('server');
      const poweredBy = response.headers.get('x-powered-by');

      if (server?.includes('nginx')) {
        detected.push({ name: 'Nginx', category: 'Web Server', confidence: 95 });
      }
      if (poweredBy?.includes('Express')) {
        detected.push({ name: 'Express.js', category: 'Backend Framework', confidence: 90 });
      }
      if (poweredBy?.includes('Next.js')) {
        detected.push({ name: 'Next.js', category: 'Frontend Framework', confidence: 95 });
      }
    } catch (error) {
      // Headers check failed, continue
    }

    // Categorize technologies
    const frontendFrameworks = detected.filter(t => t.category === 'Frontend Framework');
    const backendFrameworks = detected.filter(t => t.category === 'Backend Framework');
    const databases = detected.filter(t => t.category === 'Database');
    const cloudProviders = detected.filter(t => t.category === 'Cloud Provider');
    const analyticsTools = detected.filter(t => t.category === 'Analytics');
    const observabilityStack = detected.filter(t => t.category === 'Observability');
    const marketingTools = detected.filter(t => t.category === 'Marketing');
    const paymentProcessors = detected.filter(t => t.category === 'Payment Processor');
    const customerSupport = detected.filter(t => t.category === 'Customer Support');
    const cdnProviders = detected.filter(t => t.category === 'CDN');
    const authProviders = detected.filter(t => t.category === 'Authentication');
    const apiServices = detected.filter(t => t.category === 'API Service');

    console.log(`    ✓ Detected ${detected.length} technologies`);
    if (detected.length > 0) {
      console.log(`    → Technologies: ${detected.map(t => `${t.name} (${t.category})`).join(', ')}`);
    }

    return {
      frontendFrameworks,
      backendFrameworks,
      databases,
      cloudProviders,
      analyticsTools,
      observabilityStack,
      marketingTools,
      paymentProcessors,
      customerSupport,
      cdnProviders,
      authProviders,
      apiServices,
      allTechnologies: detected,
    };
  }

  /**
   * Detect tech stack from job postings
   */
  detectFromJobPostings(jobDescriptions: string[]): string[] {
    const techMentions = new Map<string, number>();

    const technologies = [
      // Languages
      'TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'Ruby', 'PHP', 'Swift', 'Kotlin',
      // Frontend
      'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Remix',
      // Backend
      'Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Rails', 'Spring Boot', 'ASP.NET',
      // Databases
      'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra',
      // Cloud
      'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'Terraform',
      // Data
      'Spark', 'Kafka', 'Airflow', 'Snowflake', 'BigQuery', 'Redshift',
      // ML/AI
      'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NumPy',
      // Observability
      'Datadog', 'New Relic', 'Sentry', 'Grafana', 'Prometheus',
    ];

    for (const description of jobDescriptions) {
      const lowerDesc = description.toLowerCase();

      for (const tech of technologies) {
        if (lowerDesc.includes(tech.toLowerCase())) {
          techMentions.set(tech, (techMentions.get(tech) || 0) + 1);
        }
      }
    }

    // Return technologies mentioned in 2+ job postings
    return Array.from(techMentions.entries())
      .filter(([_, count]) => count >= Math.min(2, jobDescriptions.length))
      .sort((a, b) => b[1] - a[1])
      .map(([tech]) => tech);
  }
}
