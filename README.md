# AI Manager

AI Manager is a powerful, AI-driven social media management and video editing suite designed for creators. It leverages the latest in Generative AI technology to automate content creation and streamline the video production workflow.

> **Important Note:** This is a **pure frontend product**. All processing, data storage, and AI interactions occur client-side using advanced technologies like IndexedDB for the database, FFmpeg.wasm for video processing, and the Gemini API for intelligence. No external backend server is required for its core operations.

## 🚀 Features

### 1. Media Library
- **Cloud & Local Support:** Upload files to the browser's persistent storage (IndexedDB) or browse local folders directly (via Electron integration).
- **Organization:** Tagging system with bulk-editing capabilities for easy categorization of assets.
- **Smart Preview:** High-performance preview for images, videos, and audio files.

### 2. AI Post Generation
- **Powered by Gemini 3 Flash:** Generate catchy captions and trending hashtags based on your media assets and custom prompts.
- **Custom System Instructions:** Fine-tune the AI's personality and goals in the "AI Order" section to match your brand's voice.
- **Platform Specific:** Tailored output for TikTok and Clapper.

### 3. Video Editor
- **Timeline-based Editing:** Arrange multiple clips, reorder them via drag-and-drop, and trim with frame-level accuracy.
- **Client-Side Rendering:** Powered by `ffmpeg.wasm`, render high-quality videos (720p/1080p) directly in your browser.
- **AI Video Generation:** Use **Gemini Veo** to generate entirely new video clips from text prompts and existing imagery.
- **Visual Filters:** Apply brightness, contrast, blur, grayscale, and more in real-time.

### 4. Scheduling & Auto-Posting
- **Draft & Schedule:** Create posts and schedule them for future publication.
- **Background Scheduler:** A local background process monitors your schedule and "publishes" posts at the right time.
- **Simulation Layer:** Includes a simulation service for social platform APIs (TikTok/Clapper).

### 5. Authentication & Security
- **Google OAuth 2.0:** Secure login using Google's identity platform.
- **Privacy First:** Your data remains in your browser or your local machine.

## 🛠 Tech Stack

- **Framework:** React 19 / TypeScript
- **Styling:** Tailwind CSS
- **AI Engine:** Google Gemini API (@google/genai)
- **Video Engine:** FFmpeg.wasm (@ffmpeg/ffmpeg)
- **Database:** IndexedDB (via `idb` library)
- **Desktop Integration:** Electron (for local filesystem access)
- **Build Tool:** Vite

## ⚙️ Setup & Configuration

### Environment Variables
The application requires a valid Google Gemini API Key.
- Ensure `process.env.API_KEY` is set in your environment.

### Google OAuth Setup
To enable Sign-In:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID for Web applications**.
3. Add `http://localhost:3000` (or your deployment URL) to **Authorized JavaScript origins** and **Authorized redirect URIs**.
4. Copy the Client ID and paste it into the **Settings** page within the AI Manager app.

## 🖥 Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run as Electron desktop app
npm run electron:dev
```

---
*Created with ❤️ for creators everywhere.*