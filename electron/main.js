import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config(); // lädt .env im Hauptprozess
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:3000");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// IPC: API Key an Renderer weitergeben
ipcMain.handle("get-env", (_event, key) => {
  return process.env[key] || null;
});

// New handler for opening directory dialog
ipcMain.handle("dialog:openDirectory", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (!canceled) {
    return filePaths[0];
  }
  return null;
});

const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
const audioExtensions = [".mp3", ".wav", ".ogg", ".flac"];

// New handler for scanning a directory
ipcMain.handle("fs:scanDirectory", async (_event, dirPath, type) => {
  try {
    const files = await fs.promises.readdir(dirPath);
    let extensions;
    if (type === 'image') extensions = imageExtensions;
    else if (type === 'video') extensions = videoExtensions;
    else if (type === 'audio') extensions = audioExtensions;
    else return [];

    const mediaFiles = files
      .filter(file => extensions.includes(path.extname(file).toLowerCase()))
      .map(file => path.join(dirPath, file));
    
    return mediaFiles;
  } catch (error) {
    console.error("Failed to scan directory:", error);
    return []; // Return empty array on error
  }
});


// New handler to read a file and return as a data URL
ipcMain.handle('fs:readFileAsDataURL', async (_event, filePath) => {
    try {
        const data = await fs.promises.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = 'application/octet-stream';

        if (imageExtensions.includes(ext)) {
            mimeType = `image/${ext.substring(1)}`;
        } else if (videoExtensions.includes(ext)) {
            mimeType = `video/${ext.substring(1)}`;
        } else if (audioExtensions.includes(ext)) {
            mimeType = `audio/${ext.substring(1)}`;
        }
        
        if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
        if (mimeType === 'audio/mp3') mimeType = 'audio/mpeg';

        return `data:${mimeType};base64,${data.toString('base64')}`;
    } catch (error) {
        console.error(`Failed to read file: ${filePath}`, error);
        return null;
    }
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