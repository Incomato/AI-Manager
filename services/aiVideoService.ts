import { GoogleGenAI } from "@google/genai";
import { MediaFile } from '../types';

// Encapsulate initialization in a closure to ensure it runs only once on first use.
const getAiAndKey = (() => {
    let ai: GoogleGenAI | null = null;
    let apiKey: string | null = null;
    let initialized = false;

    return (): { ai: GoogleGenAI; apiKey: string } => {
        if (!initialized) {
            initialized = true;
            try {
                // FIX: API key must be obtained from process.env.API_KEY.
                const key = process.env.API_KEY;
                if (!key) {
                    console.warn("Gemini API key is missing. AI features will be unavailable.");
                } else {
                    ai = new GoogleGenAI({ apiKey: key });
                    apiKey = key;
                }
            } catch (error) {
                console.error("Failed to initialize the Gemini AI SDK for video services.", error);
                ai = null;
                apiKey = null;
            }
        }

        if (!ai || !apiKey) {
            throw new Error("Gemini AI is not configured. Please ensure your API key is set up correctly.");
        }
        return { ai, apiKey };
    };
})();


/**
 * Generates a video using the Gemini Veo model based on a prompt and an input media file.
 * @param prompt The text prompt describing the desired video.
 * @param mediaFile The initial media file (image or video) to be used by the AI.
 * @param onProgress A callback function to report progress updates.
 * @returns A Blob of the generated MP4 video.
 */
export const generateVideoWithGemini = async (
    prompt: string,
    mediaFile: MediaFile,
    onProgress: (message: string) => void
): Promise<Blob> => {
    let ai: GoogleGenAI;
    let apiKey: string;
    try {
        const instance = getAiAndKey();
        ai = instance.ai;
        apiKey = instance.apiKey;
    } catch (error: any) {
        const errorMessage = error.message || "Failed to initialize Gemini AI service.";
        onProgress(`Error: ${errorMessage}`);
        throw new Error(errorMessage);
    }
    
    onProgress("Starting video generation with Gemini Veo...");

    const base64Data = mediaFile.data.split(',')[1];

    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: {
                imageBytes: base64Data,
                mimeType: mediaFile.mimeType,
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        onProgress("Veo is processing... This usually takes a few minutes.");

        // Poll for completion
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before checking again
            onProgress("Still processing... Thank you for your patience.");
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        onProgress("Generation complete! Finalizing video download...");

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error("Failed to get video download link from Gemini.");
        }

        // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
        const response = await fetch(`${downloadLink}&key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`Failed to download the generated video. Status: ${response.statusText}`);
        }
        
        onProgress("Video downloaded successfully.");
        return await response.blob();

    } catch (error) {
        console.error("Error generating video with Gemini:", error);
        onProgress(`Error: ${error instanceof Error ? error.message : "An unknown error occurred."}`);
        throw new Error("Failed to generate video with AI.");
    }
};