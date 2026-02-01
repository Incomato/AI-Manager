import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SocialPlatform } from '../types';

// Encapsulate the AI instance in a closure to ensure it's only initialized once, on first use.
const getAiInstance = (() => {
    let ai: GoogleGenAI | null = null;
    let initialized = false;

    return (): GoogleGenAI => {
        if (!initialized) {
            initialized = true;
            try {
                // FIX: API key must be obtained from process.env.API_KEY.
                const apiKey = process.env.API_KEY;
                if (!apiKey) {
                    console.warn("Gemini API key is missing. AI features will be unavailable.");
                } else {
                    ai = new GoogleGenAI({ apiKey });
                }
            } catch (error) {
                console.error("Failed to initialize the Gemini AI SDK. AI features will be unavailable.", error);
                ai = null;
            }
        }

        if (!ai) {
            throw new Error("Gemini AI is not configured. Please ensure your API key is set up correctly.");
        }
        return ai;
    };
})();


interface PostGenerationResult {
    content: string;
    hashtags: string[];
}

const fileToGenerativePart = (base64: string, mimeType: string) => {
  return {
    inlineData: {
      data: base64,
      mimeType
    },
  };
};

export const generatePostContent = async (
  mediaFile: { data: string; mimeType: string },
  prompt: string,
  platform: SocialPlatform,
  aiOrder: string
): Promise<PostGenerationResult> => {
  let aiInstance: GoogleGenAI;
  try {
      aiInstance = getAiInstance();
  } catch(error: any) {
      // Forward the initialization error to the UI.
      throw new Error(error.message || "Failed to initialize Gemini AI service.");
  }
  
  const model = 'gemini-3-flash-preview';
  const imagePart = fileToGenerativePart(mediaFile.data, mediaFile.mimeType);

  const userPrompt = `Based on the provided media and the user's idea, generate a social media post for ${platform}.
User idea: "${prompt}".
Your response MUST be a JSON object with two keys: "content" (a catchy and engaging caption) and "hashtags" (an array of 10-15 relevant and trending hashtags as strings).
Analyze the visual content of the media for themes, objects, and mood to create the best post.
The tone should be modern, engaging, and suitable for a young audience on platforms like ${platform}.
Do not include the \`\`\`json markdown wrapper in your response.`;

  try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({
        model: model,
        contents: { parts: [imagePart, { text: userPrompt }] },
        config: {
            systemInstruction: aiOrder,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    content: { type: Type.STRING },
                    hashtags: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["content", "hashtags"]
            },
            temperature: 0.8,
            topP: 0.95
        }
    });

    const text = response.text;
    const result = JSON.parse(text || '{}');

    return {
        content: result.content || 'AI could not generate content.',
        hashtags: result.hashtags || [],
    };

  } catch (error) {
    console.error("Error generating content with Gemini:", error);
    throw new Error("Failed to generate post content from AI.");
  }
};