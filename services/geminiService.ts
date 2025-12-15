import { GoogleGenAI, Type } from "@google/genai";
import { BackgroundCategory, ListingContent } from "../types";

// Helper to clean base64 string
const cleanBase64 = (data: string) => data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

// 1. Edit Image Background
export const editCandleBackground = async (
  imageBase64: string,
  category: BackgroundCategory
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    This is a product photo of a candle. 
    Create a new version of this image where the candle is placed in a ${category} setting.
    Keep the candle appearance exactly the same, but generate a high-quality, professional background suitable for e-commerce sales.
    Ensure the lighting matches the new environment.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', // Good balance for editing
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64(imageBase64),
          },
        },
        { text: prompt },
      ],
    },
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated");
};

// 2. Generate Listing Text (Polish)
export const generateListingText = async (
  imagesBase64: string[]
): Promise<ListingContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare parts (up to 4 images)
  const imageParts = imagesBase64.map(img => ({
    inlineData: {
      mimeType: 'image/png',
      data: cleanBase64(img),
    }
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        ...imageParts,
        { 
          text: `
            Act as a professional copywriter for OLX and Vinted in Poland.
            Analyze these candle photos.
            Write a sales listing in Polish (Polski).
            
            Return JSON with:
            - title: Catchy, SEO-optimized title (max 70 chars).
            - description: Persuasive description emphasizing atmosphere, scent (guess if visible), and quality.
            - tags: Array of 5-10 hashtags.
          ` 
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "description", "tags"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate text");
  return JSON.parse(text) as ListingContent;
};

// 3. Generate Animation (Veo)
export interface AnimationOptions {
    isWoodenWick: boolean;
    hasSnow: boolean;
    isLighting: boolean;
    hasChristmasVibe: boolean;
    customPrompt?: string;
    musicLink?: string;
    musicStartTime?: string;
}

export const generateAnimation = async (
  imageBase64: string,
  options: AnimationOptions
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct Prompt with STRICT constraints
  let promptParts = [
    "Cinematic product video.",
    "CRITICAL OBJECT PERMANENCE: The glass jar, the label, and the candle container MUST remain 100% STATIC and UNCHANGED. Do not morph, resize, or warp the jar structure. It is a solid object.",
    "ANIMATION SCOPE: Animate ONLY the flame, smoke, light reflections, and environmental particles.",
  ];

  if (options.isWoodenWick) {
    promptParts.push("WICK CONSTRAINT: The candle has a FLAT, WIDE WOODEN WICK. It is BROWN and FLAT. Do NOT replace it with a white cotton string. The flame must originate from the entire width of the wooden wick, flickering naturally like a fireplace flame.");
  }

  if (options.hasSnow) {
    promptParts.push("Environment: Add a gentle, realistic falling snow overlay effect in the foreground.");
  }

  if (options.hasChristmasVibe) {
    promptParts.push("Atmosphere: Magical Christmas vibe, warm, cozy, festive feeling.");
  }

  if (options.isLighting) {
    promptParts.push("Action: A human hand holding a lit match enters the frame and lights the WOODEN wick. The flame catches across the width of the wood.");
  } else {
    promptParts.push("Action: The candle is already lit. The flame flickers softly on the WOODEN wick. The jar remains still.");
  }

  if (options.customPrompt) {
    promptParts.push(`Additional details: ${options.customPrompt}`);
  }

  promptParts.push("Quality: Photorealistic, 4k, slow motion, highly detailed, sharp focus on the product.");

  const fullPrompt = promptParts.join(" ");

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    image: {
      imageBytes: cleanBase64(imageBase64),
      mimeType: 'image/png',
    },
    prompt: fullPrompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '9:16'
    }
  });

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");

  // Fetch the actual video bytes using the key
  const vidResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  if (!vidResponse.ok) throw new Error("Failed to download video file");
  
  const blob = await vidResponse.blob();
  return URL.createObjectURL(blob);
};

export const hasApiKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        return await window.aistudio.hasSelectedApiKey();
    }
    return !!process.env.API_KEY;
}

export const selectApiKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
    }
}