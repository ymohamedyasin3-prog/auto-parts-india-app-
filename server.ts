import express from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGeminiAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON parsing middleware with custom limits for large payloads (e.g. base64 images if needed)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route to securely delete Cloudinary images
  const handleCloudinaryDelete = async (req: express.Request, res: express.Response) => {
    try {
      const body = req.body || {};
      let publicIds: string[] = [];

      if (Array.isArray(body.publicIds)) {
        publicIds = body.publicIds;
      } else if (Array.isArray(body.public_ids)) {
        publicIds = body.public_ids;
      } else if (typeof body.publicId === "string" && body.publicId.trim()) {
        publicIds = [body.publicId.trim()];
      } else if (typeof body.public_id === "string" && body.public_id.trim()) {
        publicIds = [body.public_id.trim()];
      }

      if (!publicIds || publicIds.length === 0) {
        return res.status(400).json({ error: "Missing or invalid publicIds array or public_id" });
      }

      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "rqf1hlrx";
      const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!apiKey || !apiSecret) {
        console.warn("[Cloudinary Delete API] API key or Secret missing in server environment. Skipping Cloudinary deletion.");
        return res.json({ 
          success: true, 
          warning: "Cloudinary credentials not configured on server. Image cleanup skipped.",
          results: [] 
        });
      }

      const results = [];
      const errors = [];

      for (const rawPublicId of publicIds) {
        if (!rawPublicId || typeof rawPublicId !== "string") continue;
        
        // Ensure clean public_id extraction if a full URL was passed
        let publicId = rawPublicId;
        if (rawPublicId.includes("cloudinary.com")) {
          const uploadIndex = rawPublicId.indexOf("/image/upload/");
          if (uploadIndex !== -1) {
            let path = rawPublicId.substring(uploadIndex + "/image/upload/".length);
            const segments = path.split("/").filter(Boolean);
            const cleanSegments = segments.filter(seg => 
              !seg.includes(",") && 
              !/^(c|w|h|q|f|e|b|r|a|dpr|fl|co|l|u|pg|so|eo|s|bo|o|x|y|g|p|m|t|ar|cs|d|ki|dl)_/.test(seg) &&
              !/^v\d+$/.test(seg)
            );
            if (cleanSegments.length > 0) {
              publicId = cleanSegments.join("/");
              const lastDot = publicId.lastIndexOf(".");
              if (lastDot !== -1) {
                publicId = publicId.substring(0, lastDot);
              }
            }
          }
        }
        
        try {
          const timestamp = Math.round(new Date().getTime() / 1000).toString();
          const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
          const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

          const params = new URLSearchParams();
          params.append("public_id", publicId);
          params.append("api_key", apiKey);
          params.append("timestamp", timestamp);
          params.append("signature", signature);

          const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          const data = await response.json().catch(() => ({ result: "error" }));
          console.log(`[Cloudinary Destroy] public_id: '${publicId}' -> result:`, data.result);

          if (data.result === "ok" || data.result === "not_found") {
            results.push({ publicId, status: data.result });
          } else {
            console.warn(`[Cloudinary Destroy Warning] '${publicId}' returned result: ${data.result}`);
            results.push({ publicId, status: data.result || "failed" });
          }
        } catch (err: any) {
          console.error(`[Cloudinary Destroy Error] Failed for '${publicId}':`, err);
          errors.push({ publicId, error: err.message || String(err) });
        }
      }

      return res.json({ success: true, results, errors });
    } catch (error: any) {
      console.error("Error in delete-cloudinary-image endpoint:", error);
      return res.json({ success: true, warning: error.message || "Internal Server Error", results: [] });
    }
  };

  app.post("/api/delete-cloudinary-image", handleCloudinaryDelete);
  app.post("/api/cloudinary/delete", handleCloudinaryDelete);

  // Chat Notification Endpoint
  app.post("/api/notifications/send", async (req, res) => {
    try {
      const mod: any = await import('./notification-logic.js').catch(() => import('./notification-logic.ts'));
      if (mod && typeof mod.sendChatNotification === 'function') {
        await mod.sendChatNotification(req, res);
      } else {
        res.json({ success: true, status: "Handled" });
      }
    } catch (e: any) {
      console.warn("[Notification Endpoint]:", e?.message);
      res.json({ success: true, status: "Handled gracefully", warning: e?.message });
    }
  });

  // Gemini AI Smart Listing Auto-Fill & Image Verification Endpoint
  app.post("/api/ai/autofill-listing", async (req, res) => {
    try {
      const { image, currentBrand, currentModel, currentCategory, currentPartName } = req.body || {};
      
      const ai = getGeminiAI();
      if (!ai) {
        return res.status(503).json({
          success: false,
          error: "Gemini AI service is not initialized or API key is missing. Please enter details manually."
        });
      }

      const promptParts: any[] = [];
      let hasImage = false;

      if (image && typeof image === "string" && image.trim().length > 0) {
        if (image.startsWith("data:")) {
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            promptParts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2]
              }
            });
            hasImage = true;
          }
        } else if (image.startsWith("http://") || image.startsWith("https://")) {
          try {
            const imgRes = await fetch(image);
            if (imgRes.ok) {
              const arrayBuffer = await imgRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const contentType = imgRes.headers.get("content-type") || "image/jpeg";
              promptParts.push({
                inlineData: {
                  mimeType: contentType,
                  data: buffer.toString("base64")
                }
              });
              hasImage = true;
            }
          } catch (imgFetchErr) {
            console.warn("[Gemini AutoFill] Remote image fetch warning:", imgFetchErr);
          }
        }
      }

      const contextHint = [
        currentBrand ? `Provided Car Brand: "${currentBrand}"` : "",
        currentModel ? `Provided Car Model: "${currentModel}"` : "",
        currentCategory ? `Provided Category: "${currentCategory}"` : "",
        currentPartName ? `Provided Part Name: "${currentPartName}"` : "",
      ].filter(Boolean).join(", ");

      const analysisPrompt = `You are a professional automotive technical expert and catalog specialist for the Indian automobile market.
Carefully analyze ${hasImage ? "the provided photo and any user hints" : "the provided text context"}.

Context: ${contextHint || "No prior hints provided."}

VERIFICATION & CLASSIFICATION RULES:
1. "isAutomotive" (boolean):
   - Set to TRUE if the image/context represents a vehicle, car, bike, truck, automotive spare part, body panel, mechanical component, interior trim, electrical item, alloy wheel, tire, or an accidental/scrap car for dismantling.
   - Set to FALSE if the image is unrelated to vehicles/parts (such as food, selfies/faces, animals, landscapes, clothes, general non-automotive electronics).
2. If "isAutomotive" is false:
   - Provide "rejectionReason": A polite sentence explaining that the image does not appear to be an automotive part or vehicle.
3. If "isAutomotive" is true, extract and classify:
   - "itemType": One of "spare_part", "full_vehicle", "accidental_scrap_vehicle".
   - "carBrand": Exact identified car brand popular in India (e.g. Maruti Suzuki, Hyundai, Tata, Mahindra, Toyota, Honda, Kia, Volkswagen, Skoda, Ford, Renault, Nissan, MG, BMW, Mercedes-Benz, Audi, etc.). If the user already provided a brand hint, respect and lock to it.
   - "carModel": Specific model in India (e.g. Swift, Baleno, Creta, i20, Nexon, Harrier, XUV700, Thar, Scorpio, Innova, City, Seltos, Kwid, etc.). If user gave a model hint, strictly prioritize it.
   - "category": Must be EXACTLY ONE of these standard app categories:
     ["Body & Exterior", "Engine & Mechanical", "Lights & Electricals", "Suspension & Brakes", "Interior & Wheels", "Cooling & AC", "Transmission & Clutch", "Exhaust & Fuel", "Accidental & Scrap Cars", "Full Vehicles / Cars"]
   - "partName": Precise part name or vehicle description (e.g., "Front Bumper Assembly", "LED Headlight Unit", "Alloy Wheel Set", "Clutch Plate", "Side View Mirror", "Radiator", "Brake Caliper", "Total-Loss Accidental Car For Parts").
   - "title": A clear, professional listing title for Indian buyers (e.g. "Maruti Suzuki Swift Front Bumper (OEM)", "Hyundai Creta Left Headlight Assembly", "Tata Nexon Front End Accidental - All Spares Available").
   - "condition": One of ["Brand New", "Like New", "Used (Good)", "Refurbished", "For Scrap/Spares"].
   - "description": A concise, 2-3 sentence realistic seller description highlighting genuine fitment, condition, and compatibility for Indian car owners.
4. CRITICAL: DO NOT return, estimate, or fill any price. Price must be decided exclusively by the seller.

Respond strictly in valid JSON format matching this schema:
{
  "isAutomotive": true,
  "rejectionReason": null,
  "itemType": "spare_part",
  "title": "string",
  "carBrand": "string",
  "carModel": "string",
  "category": "string",
  "partName": "string",
  "condition": "string",
  "description": "string"
}`;

      promptParts.push({ text: analysisPrompt });

      // Candidate Gemini models with automatic fallback cascade in case of temporary high demand or quota
      const candidateModels = [
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest"
      ];
      let responseText: string | null = null;
      let lastModelError: any = null;

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts: promptParts }],
            config: {
              responseMimeType: "application/json"
            }
          });
          const text = response.text?.trim();
          if (text) {
            responseText = text;
            break;
          }
        } catch (modelErr: any) {
          lastModelError = modelErr;
          console.warn(`[Gemini AutoFill] Model ${modelName} unavailable, attempting fallback:`, modelErr?.message?.slice(0, 120) || modelErr);
        }
      }

      if (!responseText) {
        return res.status(503).json({
          success: false,
          error: lastModelError?.message?.includes("high demand")
            ? "AI model is currently experiencing temporary high demand. Please try again in a moment or enter details manually."
            : "AI service temporarily unavailable. Please enter details manually."
        });
      }

      let generatedData: any = null;
      try {
        generatedData = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn("[Gemini AutoFill] JSON Parse Warning:", responseText);
        return res.status(500).json({
          success: false,
          error: "Unable to parse AI response. Please enter details manually."
        });
      }

      if (generatedData && generatedData.isAutomotive === false) {
        return res.json({
          success: false,
          isAutomotive: false,
          message: generatedData.rejectionReason || "The uploaded image does not appear to be an automotive part or vehicle. Please upload a clear photo of a car or spare part."
        });
      }

      const rawCondition = String(generatedData.condition || "Used");
      const normalizedCondition = rawCondition.toLowerCase().includes("new") ? "New" : "Used";

      return res.json({
        success: true,
        data: {
          title: generatedData.title || "",
          carBrand: generatedData.carBrand || currentBrand || "",
          carModel: generatedData.carModel || currentModel || "",
          category: generatedData.category || currentCategory || "",
          partName: generatedData.partName || currentPartName || "",
          condition: normalizedCondition,
          rawCondition: rawCondition,
          description: generatedData.description || ""
          // Explicitly no price field
        }
      });
    } catch (error: any) {
      console.error("[Gemini AutoFill Error]:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "Failed to analyze photo with AI. Please enter details manually."
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  // Endpoint to download Debug APK
  app.get("/api/download/debug", (req, res) => {
    const filePath = path.join(process.cwd(), "app-debug.apk");
    res.download(filePath, "app-debug.apk", (err) => {
      if (err) {
        console.error("Failed to download debug APK from root, trying build outputs folder:", err);
        const fallbackPath = path.join(process.cwd(), "android/app/build/outputs/apk/debug/app-debug.apk");
        res.download(fallbackPath, "app-debug.apk", (err2) => {
          if (err2) {
            res.status(404).send("Debug APK not found. Please run the build script first.");
          }
        });
      }
    });
  });

  // Endpoint to download Release APK
  app.get("/api/download/release", (req, res) => {
    const filePath = path.join(process.cwd(), "app-release-unsigned.apk");
    res.download(filePath, "app-release-unsigned.apk", (err) => {
      if (err) {
        console.error("Failed to download release APK from root, trying build outputs folder:", err);
        const fallbackPath = path.join(process.cwd(), "android/app/build/outputs/apk/release/app-release-unsigned.apk");
        res.download(fallbackPath, "app-release-unsigned.apk", (err2) => {
          if (err2) {
            res.status(404).send("Release APK not found. Please run the build script first.");
          }
        });
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
