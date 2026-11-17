import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { RecipesSchema } from "./recipe-schemas";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type PantryLine = { id: string; name: string; quantity: number; unit: string; days_left: number | null };

// Strict schema: Gemini must return valid JSON in exactly this shape.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    recipes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          time_minutes: { type: Type.INTEGER },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pantry_item_id: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
              },
              required: ["pantry_item_id", "quantity"],
            },
          },
          extras: { type: Type.ARRAY, items: { type: Type.STRING } },
          steps: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["name", "description", "time_minutes", "ingredients", "extras", "steps"],
      },
    },
  },
  required: ["recipes"],
};

export async function generateRecipes(
  pantry: PantryLine[],
  servings: number,
  prefs: { dietary_preferences?: string[] | null; allergies?: string[] | null }
) {
  const prompt = `You are a zero-waste cooking assistant for a college student on a tight budget.
Create 3 different recipes using ONLY ingredients from the pantry list below, plus basic staples
(salt, pepper, cooking oil, water, plain spices) which go in "extras" and NOT in "ingredients".
Rules:
- Prioritize items with the lowest days_left (they expire first). Negative days_left means already expired: do not use.
- Every entry in "ingredients" must use a pantry item's exact id. Its quantity is in that item's unit and must not exceed the available quantity.
- Recipes are for ${servings} serving(s), realistic, and simple enough for a dorm or small kitchen.
- Dietary preferences: ${prefs.dietary_preferences?.join(", ") || "none"}.
- NEVER use anything related to these allergies: ${prefs.allergies?.join(", ") || "none"}.
- Keep each description to one sentence and give at most 5 short steps per recipe.

Pantry (JSON): ${JSON.stringify(pantry)}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          maxOutputTokens: 4096,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      return RecipesSchema.parse(JSON.parse(res.text ?? "{}"));
    } catch (e) {
      lastError = e; // malformed output: try once more
    }
  }
  throw lastError;
}