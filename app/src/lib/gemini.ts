// gemini.ts - Direct Google Gemini 1.5 Flash API integration for gym and food vision

// Get the Gemini API Key from local storage
export function getGeminiKey(): string | null {
  return localStorage.getItem("gemini_key");
}

// Save the Gemini API Key
export function setGeminiKey(key: string): void {
  localStorage.setItem("gemini_key", key);
}

// Clear the Gemini API Key
export function clearGeminiKey(): void {
  localStorage.removeItem("gemini_key");
}

// Helper to convert File to Base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      // Strip out the data URL prefix (e.g. "data:image/jpeg;base64,")
      const rawBase64 = base64String.split(",")[1];
      resolve(rawBase64);
    };
    reader.onerror = (error) => reject(error);
  });
}

// Generalized function to request Gemini API
async function callGemini(
  systemInstruction: string,
  promptText: string,
  imageInlineData?: { base64Data: string; mimeType: string }
): Promise<string> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please add it in Settings.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const contents: any[] = [];
  const parts: any[] = [{ text: promptText }];

  if (imageInlineData) {
    parts.unshift({
      inlineData: {
        data: imageInlineData.base64Data,
        mimeType: imageInlineData.mimeType,
      },
    });
  }

  contents.push({ parts });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1, // low temperature for highly deterministic/accurate values
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("Empty response from Gemini API");
  }

  return rawText;
}

export interface MachineAnalysisResult {
  exercise: string;
  category: "Chest" | "Back" | "Legs" | "Shoulders & Arms";
  tip: string;
}

// 1. Vision Analysis for Gym Machine
export async function identifyGymMachine(
  base64Image: string,
  mimeType: string
): Promise<MachineAnalysisResult> {
  const systemInstruction = `You are an expert personal trainer and gym equipment specialist. 
Your task is to analyze the image of a gym machine or screenshot and identify:
1. The standard name of the exercise (must match one of standard gym exercises).
2. The primary muscle category target. It MUST be exactly one of these: "Chest", "Back", "Legs", "Shoulders & Arms".
3. A short, highly practical form or safety tip (max 1 sentence).

You MUST respond strictly with a JSON object in this format:
{
  "exercise": "Dumbbell Chest Press",
  "category": "Chest",
  "tip": "Keep your elbows tucked at a 45-degree angle to protect your shoulders."
}`;

  const promptText = "Identify the gym machine in this image, categorize it, and provide one short safety tip.";
  
  const rawResponse = await callGemini(systemInstruction, promptText, {
    base64Data: base64Image,
    mimeType,
  });

  try {
    return JSON.parse(rawResponse.trim()) as MachineAnalysisResult;
  } catch (e) {
    console.error("Failed to parse Gemini machine response", rawResponse, e);
    throw new Error("Could not parse AI response as JSON. Try again with a clearer picture.");
  }
}

export interface FoodAnalysisResult {
  description: string;
  estimated_calories: number;
  estimated_protein: number;
}

// 2. Vision and Text Analysis for Desi Food & Macros
export async function analyzeMeal(
  descriptionText: string,
  base64Image?: string,
  mimeType?: string
): Promise<FoodAnalysisResult> {
  const systemInstruction = `You are a specialized sports nutritionist expert in South Asian (Desi) and European cuisines.
Your goal is to estimate the Calories (kcal) and Protein (g) content of a food plate from either an image or a text description.

Baseline User Context:
- Sex: Male
- Age: 40 years old
- Height: 181 cm
- Current Weight: 94 kg
- Goal: Body Recomposition (rebuild muscle, lose fat)

Always assume standard Desi cooking styles (use of oil, ghee, butter) when estimating, and be highly realistic about portion sizes to prevent calorie underestimation. Be conservative. 

You MUST respond strictly with a JSON object in this format:
{
  "description": "Lahori Murgh Chanay (chicken & chickpeas) with 1 roti",
  "estimated_calories": 520,
  "estimated_protein": 32
}`;

  let promptText = `Analyze this meal. Provide a brief description of the food identified, estimate its total calories (kcal) and total protein (g) conservatively.`;
  if (descriptionText) {
    promptText += `\nUser's Description: "${descriptionText}"`;
  }

  const imageInlineData = (base64Image && mimeType) 
    ? { base64Data: base64Image, mimeType }
    : undefined;

  const rawResponse = await callGemini(systemInstruction, promptText, imageInlineData);

  try {
    return JSON.parse(rawResponse.trim()) as FoodAnalysisResult;
  } catch (e) {
    console.error("Failed to parse Gemini food response", rawResponse, e);
    throw new Error("Could not parse AI response as JSON. Try again with a clearer description or image.");
  }
}
