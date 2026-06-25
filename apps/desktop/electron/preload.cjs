const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  isElectron: true,
  setToken: (token) => ipcRenderer.invoke("token:set", token),
  getToken: () => ipcRenderer.invoke("token:get"),
  printReportToPDF: (html) => ipcRenderer.invoke("report:printToPDF", html),
});
