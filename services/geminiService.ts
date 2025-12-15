import { BackgroundCategory, ListingContent } from "../types";

// Helper to clean base64 string
const cleanBase64 = (data: string) =>
  data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

// Wspólny helper: wołamy Netlify Function (serwer)
async function callNetlifyGenAI(payload: any) {
  const res = await fetch("/.netlify/functions/genai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  // funkcja zwraca JSON jako tekst, parsujemy
  if (!text) throw new Error("Empty response from AI");

// usuń ```json i ```
const cleaned = text
  .replace(/```json/gi, "")
  .replace(/```/g, "")
  .trim();

// wyciągnij czysty JSON
const start = cleaned.indexOf("{");
const end = cleaned.lastIndexOf("}");

if (start === -1 || end === -1) {
  throw new Error("No JSON found:\n" + cleaned);
}

const jsonOnly = cleaned.slice(start, end + 1);

return JSON.parse(jsonOnly) as ListingContent;

}

// 1. Edit Image Background
export const editCandleBackground = async (
  imageBase64: string,
  category: BackgroundCategory
): Promise<string> => {
  const prompt = `
This is a product photo of a candle.
Create a new version of this image where the candle is placed in a ${category} setting.
Keep the candle appearance exactly the same, but generate a high-quality, professional background suitable for e-commerce sales.
Ensure the lighting matches the new environment.
  `.trim();

  const data = await callNetlifyGenAI({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/png",
            data: cleanBase64(imageBase64),
          },
        },
        { text: prompt },
      ],
    },
  });

  // Szukamy obrazu w odpowiedzi
  const parts = data?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part?.inlineData?.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
};

// 2. Generate Listing Text (Polish)
export const generateListingText = async (
  imagesBase64: string[]
): Promise<ListingContent> => {
  const imageParts = imagesBase64.map((img) => ({
    inlineData: {
      mimeType: "image/png",
      data: cleanBase64(img),
    },
  }));

  const data = await callNetlifyGenAI({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        ...imageParts,
        {
          text: `
Act as a professional copywriter for OLX and Vinted in Poland.
Analyze these candle photos.
Write a sales listing in Polish (Polski).

Return ONLY valid JSON with:
{
  "title": "max 70 chars",
  "description": "text",
  "tags": ["#tag1", "#tag2"]
}
          `.trim(),
        },
      ],
    },
  });

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || "")
      .join("") || "";

  if (!text) throw new Error("Failed to generate text");

  const cleaned = text
  .replace(/^```json\s*/i, "")
  .replace(/^```\s*/i, "")
  .replace(/```$/i, "")
  .trim();

return JSON.parse(cleaned) as ListingContent;

};

// 3. Generate Animation (Veo) — na razie wyłączone (musi iść server-side, inaczej się wywala)
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
  _imageBase64: string,
  _options: AnimationOptions
): Promise<string> => {
  throw new Error(
    "Animation generation is disabled in the browser build. It must run server-side (Netlify Function)."
  );
};

// Te dwie funkcje już niepotrzebne (AI Studio key picker)
export const hasApiKey = async () => true;
export const selectApiKey = async () => {};
