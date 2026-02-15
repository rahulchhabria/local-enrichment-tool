/**
 * Mobile App Detection
 * Detects iOS and Android apps from company websites
 */

export interface MobileApp {
  platform: 'ios' | 'android';
  appName: string;
  appId?: string;
  appUrl: string;
  developer?: string;
  detectionMethod: string;
}

export interface MobileAppData {
  hasIosApp: boolean;
  hasAndroidApp: boolean;
  iosApps: MobileApp[];
  androidApps: MobileApp[];
  allApps: MobileApp[];
  detectedAt: Date;
}

export class MobileAppDetector {
  /**
   * Detect mobile apps from HTML content
   */
  async detectMobileApps(html: string, domain: string): Promise<MobileAppData> {
    const apps: MobileApp[] = [];

    // Method 1: App Store links
    const iosApps = this.detectAppStoreLinks(html);
    apps.push(...iosApps);

    // Method 2: Google Play links
    const androidApps = this.detectPlayStoreLinks(html);
    apps.push(...androidApps);

    // Method 3: Smart app banners (meta tags)
    const bannerApps = this.detectSmartBanners(html);
    apps.push(...bannerApps);

    // Method 4: Deep links and universal links
    const deepLinkApps = this.detectDeepLinks(html, domain);
    apps.push(...deepLinkApps);

    // Method 5: Common app download patterns
    const patternApps = this.detectAppPatterns(html);
    apps.push(...patternApps);

    // Deduplicate apps
    const uniqueApps = this.deduplicateApps(apps);

    const iosAppsList = uniqueApps.filter(a => a.platform === 'ios');
    const androidAppsList = uniqueApps.filter(a => a.platform === 'android');

    return {
      hasIosApp: iosAppsList.length > 0,
      hasAndroidApp: androidAppsList.length > 0,
      iosApps: iosAppsList,
      androidApps: androidAppsList,
      allApps: uniqueApps,
      detectedAt: new Date()
    };
  }

  /**
   * Detect App Store links
   */
  private detectAppStoreLinks(html: string): MobileApp[] {
    const apps: MobileApp[] = [];

    // Pattern: https://apps.apple.com/us/app/app-name/id123456789
    const appStoreRegex = /https?:\/\/apps\.apple\.com\/[a-z]{2}\/app\/([^\/\s"']+)\/id(\d+)/gi;
    let match;

    while ((match = appStoreRegex.exec(html)) !== null) {
      const appName = match[1].replace(/-/g, ' ');
      const appId = match[2];
      apps.push({
        platform: 'ios',
        appName: this.capitalizeWords(appName),
        appId: appId,
        appUrl: match[0],
        detectionMethod: 'App Store URL'
      });
    }

    // Also check for itunes.apple.com links
    const itunesRegex = /https?:\/\/itunes\.apple\.com\/[a-z]{2}\/app\/([^\/\s"']+)\/id(\d+)/gi;
    while ((match = itunesRegex.exec(html)) !== null) {
      const appName = match[1].replace(/-/g, ' ');
      const appId = match[2];
      apps.push({
        platform: 'ios',
        appName: this.capitalizeWords(appName),
        appId: appId,
        appUrl: match[0],
        detectionMethod: 'iTunes URL'
      });
    }

    return apps;
  }

  /**
   * Detect Google Play Store links
   */
  private detectPlayStoreLinks(html: string): MobileApp[] {
    const apps: MobileApp[] = [];

    // Pattern: https://play.google.com/store/apps/details?id=com.company.app
    const playStoreRegex = /https?:\/\/play\.google\.com\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/gi;
    let match;

    while ((match = playStoreRegex.exec(html)) !== null) {
      const packageId = match[1];
      const appName = this.extractAppNameFromPackage(packageId);
      apps.push({
        platform: 'android',
        appName: appName,
        appId: packageId,
        appUrl: match[0],
        detectionMethod: 'Google Play URL'
      });
    }

    return apps;
  }

  /**
   * Detect smart app banners (iOS and Android)
   */
  private detectSmartBanners(html: string): MobileApp[] {
    const apps: MobileApp[] = [];

    // iOS Smart App Banner: <meta name="apple-itunes-app" content="app-id=123456789">
    const iosMetaRegex = /<meta[^>]*name=["']apple-itunes-app["'][^>]*content=["']app-id=(\d+)/gi;
    let match;

    while ((match = iosMetaRegex.exec(html)) !== null) {
      apps.push({
        platform: 'ios',
        appName: 'Mobile App',
        appId: match[1],
        appUrl: `https://apps.apple.com/app/id${match[1]}`,
        detectionMethod: 'iOS Smart Banner'
      });
    }

    // iOS App Links: <meta property="al:ios:app_store_id" content="123456789">
    const iosAppLinksRegex = /<meta[^>]*property=["']al:ios:app_store_id["'][^>]*content=["'](\d+)/gi;
    while ((match = iosAppLinksRegex.exec(html)) !== null) {
      apps.push({
        platform: 'ios',
        appName: 'iOS App',
        appId: match[1],
        appUrl: `https://apps.apple.com/app/id${match[1]}`,
        detectionMethod: 'iOS App Links Meta'
      });
    }

    // Android App Links: <meta property="al:android:package" content="com.company.app">
    const androidMetaRegex = /<meta[^>]*property=["']al:android:package["'][^>]*content=["']([^"']+)/gi;
    while ((match = androidMetaRegex.exec(html)) !== null) {
      const packageId = match[1];
      apps.push({
        platform: 'android',
        appName: this.extractAppNameFromPackage(packageId),
        appId: packageId,
        appUrl: `https://play.google.com/store/apps/details?id=${packageId}`,
        detectionMethod: 'Android App Links Meta'
      });
    }

    // Google Play meta tag
    const googlePlayMetaRegex = /<meta[^>]*name=["']google-play-app["'][^>]*content=["']app-id=([^"']+)/gi;
    while ((match = googlePlayMetaRegex.exec(html)) !== null) {
      const packageId = match[1];
      apps.push({
        platform: 'android',
        appName: this.extractAppNameFromPackage(packageId),
        appId: packageId,
        appUrl: `https://play.google.com/store/apps/details?id=${packageId}`,
        detectionMethod: 'Google Play Meta Tag'
      });
    }

    return apps;
  }

  /**
   * Detect deep links and universal links
   */
  private detectDeepLinks(html: string, domain: string): MobileApp[] {
    const apps: MobileApp[] = [];

    // iOS Universal Links: <link rel="apple-touch-icon">
    if (html.includes('apple-touch-icon')) {
      // This suggests an iOS-friendly web app, but we need more evidence
      // We'll look for app-argument or other indicators
      const appArgumentRegex = /<meta[^>]*name=["']apple-itunes-app["'][^>]*app-argument=([^"']+)/gi;
      const match = appArgumentRegex.exec(html);
      if (match) {
        apps.push({
          platform: 'ios',
          appName: 'Mobile App',
          appUrl: match[1],
          detectionMethod: 'Universal Links'
        });
      }
    }

    // Android App Links: intent:// URLs
    const intentRegex = /intent:\/\/([^\/\s"']+)/gi;
    let match;
    while ((match = intentRegex.exec(html)) !== null) {
      apps.push({
        platform: 'android',
        appName: 'Mobile App',
        appUrl: match[0],
        detectionMethod: 'Android Intent URL'
      });
    }

    return apps;
  }

  /**
   * Detect common app download patterns
   */
  private detectAppPatterns(html: string): MobileApp[] {
    const apps: MobileApp[] = [];

    // Look for common phrases with nearby links
    const patterns = [
      /download.*(?:on|from).*app store/gi,
      /get it on.*app store/gi,
      /available on.*app store/gi,
      /download.*(?:on|from).*google play/gi,
      /get it on.*google play/gi,
      /available on.*google play/gi,
    ];

    for (const pattern of patterns) {
      if (pattern.test(html)) {
        // We found indicators but already captured the URLs above
        // This is mainly for confidence scoring
      }
    }

    return apps;
  }

  /**
   * Remove duplicate apps
   */
  private deduplicateApps(apps: MobileApp[]): MobileApp[] {
    const seen = new Set<string>();
    const unique: MobileApp[] = [];

    for (const app of apps) {
      const key = `${app.platform}-${app.appId || app.appUrl}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(app);
      }
    }

    return unique;
  }

  /**
   * Extract app name from package ID
   */
  private extractAppNameFromPackage(packageId: string): string {
    // e.g., "com.company.appname" -> "Appname"
    const parts = packageId.split('.');
    const lastPart = parts[parts.length - 1];
    return this.capitalizeWords(lastPart.replace(/([a-z])([A-Z])/g, '$1 $2'));
  }

  /**
   * Capitalize words
   */
  private capitalizeWords(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Check if domain has mobile apps using external APIs (future enhancement)
   */
  async checkAppStores(domain: string): Promise<{ ios: boolean; android: boolean }> {
    // This would require App Store/Play Store API access
    // For now, return basic detection
    return {
      ios: false,
      android: false
    };
  }

  /**
   * Get summary statistics
   */
  static getSummary(detections: MobileAppData[]): {
    totalCompanies: number;
    withIosApp: number;
    withAndroidApp: number;
    withBothApps: number;
    withNoApps: number;
  } {
    return {
      totalCompanies: detections.length,
      withIosApp: detections.filter(d => d.hasIosApp).length,
      withAndroidApp: detections.filter(d => d.hasAndroidApp).length,
      withBothApps: detections.filter(d => d.hasIosApp && d.hasAndroidApp).length,
      withNoApps: detections.filter(d => !d.hasIosApp && !d.hasAndroidApp).length,
    };
  }
}
