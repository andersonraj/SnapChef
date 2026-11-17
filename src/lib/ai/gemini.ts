import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { PROMPTS } from "./prompts";
import { ScanSchema, type ScanResult } from "./schemas";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function scanImage(
  mode: "fridge" | "receipt",
  base64: string,
  mimeType: string
): Promise<ScanResult> {
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
    contents: [{ inlineData: { mimeType, data: base64 } }, { text: PROMPTS[mode] }],
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  return ScanSchema.parse(JSON.parse(res.text ?? "{}"));
}