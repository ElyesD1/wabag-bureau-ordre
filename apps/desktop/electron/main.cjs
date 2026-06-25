const { app, BrowserWindow, ipcMain, dialog, safeStorage } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const isDev = !!process.env.ELECTRON_DEV;
const tokenFile = path.join(app.getPath("userData"), "token.bin");

function createWindow() {
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
    },
  });
  win.once("ready-to-show", () => win.show());
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

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
