/**
 * Preload script - runs before web content loads
 * Bridge between Electron main process and renderer (if needed)
 */

// For now, this is minimal since the UI is fully web-based
// and communicates with the Express API directly

console.log('[Preload] Electron preload script loaded');

// Could expose Electron APIs to renderer if needed:
// import { contextBridge, ipcRenderer } from 'electron';
//
// contextBridge.exposeInMainWorld('electron', {
//   // Expose safe APIs here
// });
