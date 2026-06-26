const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const isDev = !!process.env.ELECTRON_DEV;
const tokenFile = path.join(app.getPath("userData"), "token.bin");
const dbgLog = path.join(app.getPath("userData"), "bo-server.log");
const childLog = path.join(app.getPath("userData"), "bo-server-child.log");
function dbg(...a) {
  try {
    fs.appendFileSync(dbgLog, a.map(String).join(" ") + "\n");
  } catch {}
}

// ---------------------------------------------------------------------------
// Embedded API server: each machine runs its own FastAPI process (bundled with
// PyInstaller) on a private 127.0.0.1 port, talking to the shared MongoDB Atlas
// database. No hosting, no LAN sharing — the database is the only shared layer.
// ---------------------------------------------------------------------------
let serverProc = null;
let splash = null;

function serverBinaryPath() {
  const exe = process.platform === "win32" ? "bo-server.exe" : "bo-server";
  return app.isPackaged
    ? path.join(process.resourcesPath, "bo-server", exe)
    : path.join(__dirname, "..", "..", "server", "pyi-dist", "bo-server", exe);
}

function readServerConfig() {
  const p = app.isPackaged
    ? path.join(process.resourcesPath, "server-config.json")
    : path.join(__dirname, "..", "resources", "server-config.json");
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

// A JWT secret unique to this machine, persisted so logins survive restarts.
function getJwtSecret() {
  const p = path.join(app.getPath("userData"), "jwt.secret");
  try {
    return fs.readFileSync(p, "utf8").trim();
  } catch {
    const s = crypto.randomBytes(48).toString("hex");
    try {
      fs.writeFileSync(p, s, { mode: 0o600 });
    } catch {}
    return s;
  }
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// Polls the REAL readiness probe (/health/ready pings Atlas), so the app only
// appears once the database is actually reachable — not merely when the port binds.
async function waitForHealth(url, ms = 35000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url + "/health/ready");
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

// Returns the local server base URL, or null if it could not be started.
async function startServer() {
  const bin = serverBinaryPath();
  const cfg = readServerConfig();
  dbg("[bo] binary:", bin, "exists:", fs.existsSync(bin));
  dbg("[bo] config:", cfg && cfg.mongodbUri ? "loaded" : "MISSING");
  if (!fs.existsSync(bin) || !cfg || !cfg.mongodbUri) return null;

  // Capture the server's stdout/stderr (incl. Python tracebacks) for support —
  // a single ImportError line turns a black-box field failure into a 2-min fix.
  let childFd;
  try {
    childFd = fs.openSync(childLog, "a");
  } catch {}

  const port = await getFreePort();
  const url = `http://127.0.0.1:${port}`;
  dbg("[bo] spawning on", url);
  serverProc = spawn(bin, [], {
    env: {
      ...process.env,
      PORT: String(port),
      MONGODB_URI: cfg.mongodbUri,
      MONGODB_DB: cfg.mongodbDb || "bureau_ordre",
      JWT_SECRET: getJwtSecret(),
      CORS_ORIGINS: "*",
    },
    stdio: childFd ? ["ignore", childFd, childFd] : "ignore",
    windowsHide: true,
  });
  serverProc.on("error", (e) => dbg("[bo] spawn error:", e && e.message));
  serverProc.on("exit", (code, sig) => {
    dbg("[bo] server exited code=", code, "sig=", sig);
    serverProc = null;
  });
  const ok = await waitForHealth(url);
  dbg("[bo] ready:", ok);
  return ok ? url : null;
}

function stopServer() {
  if (!serverProc) return;
  const pid = serverProc.pid;
  try {
    if (process.platform === "win32" && pid) {
      // SIGTERM doesn't reliably kill the PyInstaller process tree on Windows.
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    } else {
      serverProc.kill();
    }
  } catch {}
  serverProc = null;
}

// Lightweight splash shown instantly so launch never looks frozen while the
// server boots + the first Atlas handshake completes.
function createSplash() {
  splash = new BrowserWindow({
    width: 440,
    height: 280,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: "#08365F",
    show: true,
  });
  const html =
    '<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#08365F;color:#eaf3fb;font-family:system-ui,-apple-system,Segoe UI,sans-serif;gap:18px">' +
    '<div style="font-size:20px;font-weight:700;letter-spacing:.04em">WABAG · Bureau d\'Ordre</div>' +
    '<div style="font-size:13px;color:#9fc1de">Démarrage du serveur local…</div>' +
    '<div style="width:34px;height:34px;border:3px solid rgba(255,255,255,.18);border-top-color:#2fa4db;border-radius:50%;animation:s 1s linear infinite"></div>' +
    "<style>@keyframes s{to{transform:rotate(360deg)}}</style></body>";
  splash.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
}
function closeSplash() {
  if (splash && !splash.isDestroyed()) splash.close();
  splash = null;
}

function createWindow(serverUrl) {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#08365F",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: serverUrl ? [`--server-url=${serverUrl}`] : [],
    },
  });
  win.once("ready-to-show", () => {
    closeSplash();
    win.show();
  });
  // Allow the in-app guide (guide.html) and the PDF viewer (blob URLs) to open
  // in their own window instead of being blocked.
  win.webContents.setWindowOpenHandler(() => ({ action: "allow" }));
  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
  return win;
}

// --- Secure token storage via OS keychain (safeStorage) ---
ipcMain.handle("token:set", (_e, token) => {
  if (!token) {
    if (fs.existsSync(tokenFile)) fs.unlinkSync(tokenFile);
    return true;
  }
  const enc = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(token)
    : Buffer.from(token, "utf8");
  fs.writeFileSync(tokenFile, enc);
  return true;
});
ipcMain.handle("token:get", () => {
  if (!fs.existsSync(tokenFile)) return null;
  const buf = fs.readFileSync(tokenFile);
  try {
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(buf)
      : buf.toString("utf8");
  } catch {
    return null;
  }
});

// --- Render the journal report HTML to a PDF (client-side, pinned Chromium) ---
ipcMain.handle("report:printToPDF", async (_e, html) => {
  const w = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  await w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  const pdf = await w.webContents.printToPDF({ printBackground: true, landscape: true });
  w.destroy();
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: "journal.pdf",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (canceled || !filePath) return { saved: false };
  fs.writeFileSync(filePath, pdf);
  return { saved: true, filePath };
});

// Single-instance: a second launch focuses the existing window instead of
// spawning a second embedded server.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = BrowserWindow.getAllWindows().find((x) => x !== splash) || BrowserWindow.getAllWindows()[0];
    if (w) {
      if (w.isMinimized()) w.restore();
      w.focus();
    }
  });

  app.whenReady().then(async () => {
    createSplash();
    let url = null;
    try {
      url = await startServer();
    } catch (e) {
      dbg("[bo] startServer threw:", e && e.message);
    }
    if (!url && app.isPackaged) {
      closeSplash();
      const blocked = !fs.existsSync(serverBinaryPath());
      dialog.showErrorBox(
        "Bureau d'Ordre",
        blocked
          ? "Le composant serveur a été bloqué ou supprimé par l'antivirus (Windows Defender).\n\n" +
              "Ajoutez une exception pour le dossier d'installation de l'application, puis relancez-la."
          : "Le serveur local n'a pas pu démarrer.\n\n" +
              "Vérifiez la connexion Internet (la base de données est en ligne), puis relancez l'application.\n\n" +
              "Journal : " + childLog,
      );
    }
    createWindow(url);
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(url);
    });
  });

  app.on("before-quit", stopServer);
  app.on("quit", stopServer);
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
