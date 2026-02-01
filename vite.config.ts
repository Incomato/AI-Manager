import { URL, fileURLToPath } from 'url';
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "./", // WICHTIG für relative Pfade in Electron
    server: {
      port: 3000,
      host: "0.0.0.0",
    },
    plugins: [react()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        // Fix: __dirname is not available in ES modules. Replaced with `import.meta.url` for correct path resolution.
        "@": fileURLToPath(new URL("./", import.meta.url)), // statt "."
      },
    },
    optimizeDeps: {
      exclude: [
        "worker.js",
        "@ffmpeg/ffmpeg",
        "@ffmpeg/util"
      ],
    },
  };
});
