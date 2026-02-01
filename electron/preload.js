import { contextBridge, ipcRenderer } from "electron";

// sichere Brücke zwischen Renderer und Node
contextBridge.exposeInMainWorld("electronAPI", {
  getEnv: (key) => ipcRenderer.invoke("get-env", key),
  selectDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  scanDirectory: (path, type) => ipcRenderer.invoke("fs:scanDirectory", path, type),
  readFileAsDataURL: (filePath) => ipcRenderer.invoke("fs:readFileAsDataURL", filePath),
});