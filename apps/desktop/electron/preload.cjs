const { contextBridge, ipcRenderer } = require("electron");

// The main process passes the embedded server's URL via --server-url=<url>.
const arg = process.argv.find((a) => a.startsWith("--server-url="));
const serverUrl = arg ? arg.slice("--server-url=".length) : null;

contextBridge.exposeInMainWorld("api", {
  isElectron: true,
  serverUrl,
  setToken: (token) => ipcRenderer.invoke("token:set", token),
  getToken: () => ipcRenderer.invoke("token:get"),
  printReportToPDF: (html) => ipcRenderer.invoke("report:printToPDF", html),
});
