// The only bridge between the page and Electron (AGENT_README §7: named
// functions only, no Node APIs in the renderer). Runs sandboxed.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("edusuite", {
  app: {
    version: () => ipcRenderer.invoke("app:version"),
    /** { apiBaseUrl, platform } */
    config: () => ipcRenderer.invoke("app:config"),
  },
  update: {
    status: () => ipcRenderer.invoke("update:status"),
  },
  /** Refresh token in the OS-encrypted vault. The access token stays in memory in the page. */
  auth: {
    getToken: () => ipcRenderer.invoke("auth:getToken"),
    setToken: (token) => ipcRenderer.invoke("auth:setToken", token),
    clearToken: () => ipcRenderer.invoke("auth:clearToken"),
  },
  print: {
    /** Prints the current page to PDF and asks where to save it. */
    toPdf: (suggestedName) => ipcRenderer.invoke("print:toPdf", suggestedName),
  },
  file: {
    /** data: Uint8Array. Returns { saved, fileName? }. */
    saveAs: (suggestedName, data) => ipcRenderer.invoke("file:saveAs", { suggestedName, data }),
  },
  motion: {
    /** Returns a URL on the isolated edusuite-motion:// origin for the player iframe. */
    open: (html) => ipcRenderer.invoke("motion:open", html),
  },
});
