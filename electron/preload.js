const { contextBridge, ipcRenderer } = require("electron");

// Expose limited API to renderer process
contextBridge.exposeInMainWorld("electron", {
  // App info
  isElectron: true,
  isDev: !require("electron").app.isPackaged,
  
  // IPC communication
  send: (channel, data) => {
    if (typeof channel === "string") {
      ipcRenderer.send(channel, data);
    }
  },
  
  invoke: async (channel, data) => {
    if (typeof channel === "string") {
      return await ipcRenderer.invoke(channel, data);
    }
  },
  
  on: (channel, func) => {
    if (typeof channel === "string") {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  
  off: (channel, func) => {
    if (typeof channel === "string") {
      ipcRenderer.off(channel, func);
    }
  },
  
  once: (channel, func) => {
    if (typeof channel === "string") {
      ipcRenderer.once(channel, (event, ...args) => func(...args));
    }
  },
  
  // Platform info
  platform: process.platform,
  nodeEnv: process.env.NODE_ENV || "production",
  
  // App version and info
  appVersion: require("electron").app.getVersion?.() || "1.0.0",
});

// Prevent accidental navigation
window.addEventListener("beforeunload", (e) => {
  // Allow navigation only if app is closing
  if (!e.returnValue) {
    e.returnValue = true;
  }
});

// Prevent drag-drop file loading (browser-like behavior)
document.addEventListener(
  "dragover",
  (e) => {
    e.preventDefault();
    e.stopPropagation();
  },
  false
);

document.addEventListener(
  "drop",
  (e) => {
    e.preventDefault();
    e.stopPropagation();
  },
  false
);

// Log Electron context is ready
console.log("✓ Electron preload script loaded successfully");
