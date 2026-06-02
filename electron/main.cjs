const { app, BrowserWindow, Menu, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const isDev = !app.isPackaged;

// =========================
// ENABLE PERFORMANCE OPTIMIZATIONS
// =========================
// Enable hardware acceleration for smooth rendering
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-features", "VizDisplayCompositor");

// Optimize memory and rendering
app.commandLine.appendSwitch("disable-extensions");
app.commandLine.appendSwitch("disable-sync");
app.commandLine.appendSwitch("no-service-autorun");

// =========================
// SINGLE INSTANCE LOCK
// =========================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;

let backendProcess = null;

// =========================
// LOAD ENV VARIABLES
// =========================
const envPath = path.join(__dirname, "../.env");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");

  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");

      const key = parts[0].trim();

      let value = parts.slice(1).join("=").trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  });
}

// =========================
// START BACKEND SERVER
// =========================
const startBackendServer = async () => {
  return new Promise((resolve) => {
    try {
      let serverPath;

      if (app.isPackaged) {
        serverPath = path.join(
          process.resourcesPath,
          "app.asar.unpacked",
          "server.cjs"
        );
      } else {
        serverPath = path.join(__dirname, "../server.cjs");
      }

      console.log("🚀 Starting backend...");

      console.log("Server Path:", serverPath);

      const executable = isDev ? "node" : process.execPath;

      backendProcess = spawn(executable, [serverPath], {
        cwd: path.dirname(serverPath),

        env: { ...process.env },

        shell: false,

        detached: false,

        stdio: "ignore",
      });

      backendProcess.on("spawn", () => {
        console.log("✅ Backend started");

        resolve();
      });

      backendProcess.on("error", (err) => {
        console.error("❌ Backend failed:", err);

        resolve();
      });

      backendProcess.on("exit", (code) => {
        console.log(`⚠ Backend exited with code ${code}`);

        backendProcess = null;
      });

      setTimeout(() => {
        resolve();
      }, 2000);
    } catch (err) {
      console.error("❌ Backend startup error:", err);

      resolve();
    }
  });
};

// =========================
// CREATE MAIN WINDOW
// =========================
const createWindow = () => {
  // Prevent duplicate windows
  if (mainWindow) {
    mainWindow.focus();

    return;
  }

  mainWindow = new BrowserWindow({
    title: "Ronit Workspace",

    width: 1400,

    height: 900,

    minWidth: 1000,

    minHeight: 700,

    autoHideMenuBar: true,

    titleBarStyle: "hidden",

    titleBarOverlay: {
      color: "#020617",

      symbolColor: "#ffffff",

      height: 30,
    },

    backgroundColor: "#020617",

    show: false,

    webPreferences: {
      nodeIntegration: false,

      contextIsolation: true,

      preload: path.join(__dirname, "preload.js"),

      // Performance optimizations
      sandbox: true,
      enableRemoteModule: false,
      v8Code: false,
      // Enable v-sync for smooth rendering
      vsyncOff: false,
    },
  });

  // Prevent popup/new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  // =========================
  // LOAD REACT APP
  // =========================
  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    const indexPath = path.join(
      __dirname,
      "../dist/index.html"
    );

    console.log("Loading:", indexPath);

    mainWindow.loadFile(indexPath);
  }

  // Show only after ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    mainWindow.maximize();
  });

  // Set app title
  mainWindow.setTitle("Ronit Workspace");

  // =========================
  // OPTIONAL DEVTOOLS
  // =========================
  /*
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  */

  // =========================
  // ERROR HANDLING
  // =========================
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error(
        `❌ Failed to load: ${errorCode} - ${errorDescription}`
      );
    }
  );

  mainWindow.webContents.on("crashed", () => {
    console.error("❌ Renderer crashed");
  });

  mainWindow.on("unresponsive", () => {
    console.warn("⚠ Window unresponsive");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

// =========================
// SECOND INSTANCE HANDLER
// =========================
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.focus();
  }
});

// =========================
// SHORTCUTS
// =========================
const registerShortcuts = () => {
  globalShortcut.register("Control+R", () => false);

  globalShortcut.register("Control+Shift+R", () => false);

  globalShortcut.register("F5", () => false);

  if (isDev) {
    globalShortcut.register("Control+I", () => {
      if (mainWindow) {
        mainWindow.webContents.toggleDevTools();
      }
    });
  }
};

// =========================
// MENU
// =========================
const createMenu = () => {
  const template = [
    {
      label: "Edit",

      submenu: [
        { role: "undo" },

        { role: "redo" },

        { type: "separator" },

        { role: "cut" },

        { role: "copy" },

        { role: "paste" },
      ],
    },

    {
      label: "View",

      submenu: [
        { role: "resetZoom" },

        { role: "zoomIn" },

        { role: "zoomOut" },

        { type: "separator" },

        { role: "togglefullscreen" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(menu);
};

// =========================
// APP READY
// =========================
app.whenReady().then(async () => {
  try {
    await startBackendServer();

    createWindow();

    createMenu();

    registerShortcuts();
  } catch (err) {
    console.error("❌ App startup failed:", err);
  }
});

// =========================
// ACTIVATE (MACOS)
// =========================
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// =========================
// WINDOW CLOSED
// =========================
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// =========================
// CLEANUP
// =========================
app.on("will-quit", () => {
  globalShortcut.unregisterAll();

  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (err) {
      console.error("Error killing backend:", err);
    }

    backendProcess = null;
  }
});