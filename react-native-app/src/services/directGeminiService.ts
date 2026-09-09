/**
 * Direct Gemini AI Engine for React Native (Android / iOS)
 * Calls Google Generative Language API directly without intermediate servers or brokers.
 */

// Production API Key embedded or injected at build-time
const GEMINI_DIRECT_API_KEY =
  (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) ||
  '';

export interface DirectGeminiAutofillParams {
  imageUriOrBase64?: string;
  currentBrand?: string;
  currentModel?: string;
  currentCategory?: string;
  currentPartName?: string;
  taxonomyBrands: Record<string, string[]>;
  taxonomyCategories: Record<string, string[]>;
}

export interface DirectGeminiAutofillResult {
  success: boolean;
  isAutomotive?: boolean;
  message?: string;
  error?: string;
  data?: {
    title?: string;
    carBrand?: string;
    carModel?: string;
    category?: string;
    partName?: string;
    condition?: 'New' | 'Used';
    description?: string;
  };
}

export async function callGeminiDirectlyFromDevice(
  params: DirectGeminiAutofillParams
): Promise<DirectGeminiAutofillResult> {
  const apiKey = GEMINI_DIRECT_API_KEY || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the mobile application.');
  }

  const brandNames = Object.keys(params.taxonomyBrands || {});
  const categoryNames = Object.keys(params.taxonomyCategories || {});

  const promptText = `
You are an expert Indian automotive engineer and car spare parts identifier for a used car spare parts marketplace in India.
Analyze the provided image and/or the current part info.

CRITICAL FIRST CHECK - AUTOMOTIVE RELEVANCE:
You must determine if the image depicts an automotive vehicle, automotive spare part, car accessory, mechanical engine component, vehicle interior/exterior part, tyre, wheel, tool, or auto garage equipment.
If the image is completely NOT related to automobiles (e.g. human selfie, animal, food, computer code, landscape, random household item), return:
{
  "isAutomotive": false,
  "message": "The uploaded photo does not appear to be an automobile or automotive spare part. Please upload a clear photo of an automotive vehicle or spare part."
}

IF THE IMAGE IS AUTOMOTIVE:
1. Identify the car brand (e.g., Maruti Suzuki, Hyundai, Tata, Mahindra, Toyota, Honda, Kia, etc.). Choose from known brands if applicable: ${brandNames.slice(0, 30).join(', ')}.
2. Identify the specific car model (e.g., Swift, Baleno, Creta, Nexon, Thar, Innova, City, etc.).
3. Identify the category. Choose the best matching category from: ${categoryNames.slice(0, 30).join(', ')}.
4. Identify the specific spare part name (e.g., Headlight Assembly, Alternator, Steering Rack, Front Bumper, Brake Pads, Side Mirror, Radiator, Alloy Wheel, etc.).
5. Determine condition: 'Used' or 'New'. Default to 'Used' for pre-owned parts.
6. Generate a crisp, professional listing title (e.g., 'Maruti Suzuki Swift Front Bumper (OEM)').
7. Write an authentic, professional seller description (2-4 sentences) highlighting condition, compatibility, and fitment. DO NOT include any price.

RESPOND ONLY WITH A VALID JSON OBJECT matching this exact structure:
{
  "isAutomotive": true,
  "carBrand": "string",
  "carModel": "string",
  "category": "string",
  "partName": "string",
  "condition": "Used" | "New",
  "title": "string",
  "description": "string"
}
`;

  // Prepare contents parts
  const contentsParts: any[] = [];

  if (params.imageUriOrBase64) {
    let rawBase64 = params.imageUriOrBase64;
    let mimeType = 'image/jpeg';

    if (rawBase64.startsWith('data:')) {
      const match = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        rawBase64 = match[2];
      }
    }

    // Only attach inline data if we have base64 content
    if (!rawBase64.startsWith('http://') && !rawBase64.startsWith('https://')) {
      contentsParts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: rawBase64,
        },
      });
    }
  }

  // Add context if provided
  let contextDetails = '';
  if (params.currentBrand) contextDetails += ` Current Brand: ${params.currentBrand}.`;
  if (params.currentModel) contextDetails += ` Current Model: ${params.currentModel}.`;
  if (params.currentCategory) contextDetails += ` Current Category: ${params.currentCategory}.`;
  if (params.currentPartName) contextDetails += ` Current Part: ${params.currentPartName}.`;

  contentsParts.push({
    text: promptText + (contextDetails ? `\nSeller hints:${contextDetails}` : ''),
  });

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: contentsParts,
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }

      const resData = await res.json();
      const textOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        throw new Error('Empty response from Gemini AI');
      }

      const parsed = JSON.parse(textOutput);

      if (parsed.isAutomotive === false) {
        return {
          success: false,
          isAutomotive: false,
          message: parsed.message || 'The uploaded photo does not appear to be an automotive part.',
        };
      }

      return {
        success: true,
        isAutomotive: true,
        data: {
          title: parsed.title,
          carBrand: parsed.carBrand,
          carModel: parsed.carModel,
          category: parsed.category,
          partName: parsed.partName,
          condition: parsed.condition === 'New' ? 'New' : 'Used',
          description: parsed.description,
        },
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[Direct Gemini] Model ${model} attempt failed:`, err?.message);
    }
  }

  throw new Error(lastError?.message || 'Failed to connect directly to Google Gemini AI');
}
