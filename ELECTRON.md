# Electron Desktop App Guide

## Overview

This project can be packaged as a native macOS application using Electron. The desktop app provides:

- Native macOS window with native titlebar
- Runs the Express server in the background
- Same functionality as the web version
- Standalone executable - no need to open browser

## Architecture

```
┌──────────────────────────────────────┐
│   Electron Main Process              │
│   (dist/electron/main.js)            │
│                                      │
│   1. Spawns Express server           │
│   2. Waits for server ready          │
│   3. Opens BrowserWindow             │
└──────────────────────────────────────┘
            │
            │ Child Process
            ▼
┌──────────────────────────────────────┐
│   Express Server                     │
│   (dist/index.js)                    │
│                                      │
│   Listens on localhost:3000          │
└──────────────────────────────────────┘
            │
            │ HTTP
            ▼
┌──────────────────────────────────────┐
│   BrowserWindow (Renderer)           │
│                                      │
│   Loads localhost:3000               │
│   Shows inline HTML UI               │
└──────────────────────────────────────┘
```

## Building for Distribution

### Requirements

- Node.js 18+
- macOS (for building .app bundles)
- Xcode Command Line Tools

### Build Commands

```bash
# Full build (universal binary)
npm run electron:dist

# Architecture-specific builds
npm run electron:build          # Current architecture
npm run electron:build:universal # Intel + Apple Silicon (same as electron:dist)
```

### Output Files

```
release/
├── mac/
│   ├── Local Enrichment Tool.app      # Application bundle
│   └── Local Enrichment Tool.app.zip  # Zipped app
├── mac-arm64/                          # Apple Silicon specific
├── mac-x64/                            # Intel specific
└── *.dmg                               # DMG installer
```

## Development

### Run in Dev Mode

```bash
npm run electron:dev
```

This:
1. Compiles TypeScript (`src/` and `electron/`)
2. Launches Electron with DevTools
3. Enables hot reload (restart to see changes)

### Debugging

- **Main Process**: Use `console.log()` - shows in terminal
- **Renderer Process**: Open DevTools (auto-opens in dev mode)
- **Express Server**: Logs prefixed with `[Server]`

### Project Structure

```
electron/
├── main.ts          # Electron entry point
├── preload.ts       # Security bridge
└── tsconfig.json    # Electron TS config

build/
├── entitlements.mac.plist  # macOS permissions
└── icon.png         # App icon (optional)

dist/
├── electron/        # Compiled Electron code
│   ├── main.js
│   └── preload.js
└── index.js         # Compiled Express server
```

## Configuration

### electron-builder.json

Controls packaging behavior:
- App ID, name, copyright
- File inclusion/exclusion
- macOS-specific settings
- DMG appearance
- Code signing (if configured)

### Environment Variables

The Electron app reads the same `.env` file as the web version:

```bash
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
PORT=3000
SENTRY_DSN=https://...
```

**Note:** The `ELECTRON_MODE=true` env var is automatically set by Electron to distinguish from web mode.

## Customization

### Window Settings

Edit `electron/main.ts` - `createWindow()` function:

```typescript
const mainWindow = new BrowserWindow({
  width: 1200,           // Initial width
  height: 800,          // Initial height
  minWidth: 900,        // Minimum width
  minHeight: 600,       // Minimum height
  titleBarStyle: 'hiddenInset', // macOS native titlebar
  // ... more options
});
```

### Menu Bar

Edit `electron/main.ts` - `createMenu()` function to add custom menu items.

### Icon

Replace `build/icon.png` with your own 1024x1024 PNG. Rebuild to apply.

## Distribution

### Unsigned Build

Current configuration creates unsigned builds. Users will see:

> "Local Enrichment Tool" cannot be opened because the developer cannot be verified.

**Workaround:**
```bash
# Right-click the .app and select "Open"
# Or: Remove quarantine attribute
xattr -cr "Local Enrichment Tool.app"
```

### Code Signing (Optional)

To create signed builds:

1. Join Apple Developer Program ($99/year)
2. Create Developer ID certificate
3. Add to electron-builder.json:

```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)",
    "notarize": {
      "teamId": "TEAM_ID"
    }
  }
}
```

### Notarization (Optional)

For Gatekeeper approval:

1. Sign the app (see above)
2. Set environment variables:
   ```bash
   export APPLE_ID="your@email.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   ```
3. Build with notarization enabled

## Troubleshooting

### "Server failed to start"

- Check that Express server compiles (`npm run build`)
- Check `.env` has valid `ANTHROPIC_API_KEY`
- Check port 3000 isn't already in use

### "Application is damaged"

macOS Gatekeeper blocking unsigned app:
```bash
xattr -cr "Local Enrichment Tool.app"
```

### Changes not showing

- Electron caches aggressively
- Quit fully and rebuild: `npm run electron:dev`

### Native modules errors

Some npm packages need rebuilding for Electron:
```bash
npx electron-rebuild
```

## FAQ

**Q: Can I use this without Electron?**
Yes! Just run `npm run dev` - the web version still works.

**Q: Does this work on Windows/Linux?**
The code supports it, but electron-builder.json is macOS-only. Add `win` and `linux` configs.

**Q: Can I ship this to users?**
Yes, but consider code signing for a better user experience.

**Q: How big is the .app file?**
~200MB (includes Node.js runtime and Chromium)

**Q: Can I auto-update the app?**
Yes, integrate electron-updater (not included by default)

## Resources

- [Electron Docs](https://www.electronjs.org/docs/latest)
- [electron-builder Docs](https://www.electron.build/)
- [Code Signing Guide](https://www.electron.build/code-signing)
