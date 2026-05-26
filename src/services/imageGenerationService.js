// Image Generation Service using Render backend API

/**
 * Intelligent Visual Intent Detection
 * Semantic analysis that understands visual requests naturally
 */

export function analyzeVisualIntent(text) {
  if (!text || text.trim().length === 0) {
    return { isVisual: false, confidence: 0, reason: "empty" };
  }

  const lowerText = text.toLowerCase().trim();
  let visualScore = 0;
  const reasons = [];

  // Spelling corrections
  const correctedText = lowerText
    .replace(/\bgenrate\b/g, "generate")
    .replace(/\bcraete\b/g, "create")
    .replace(/\bdrow\b/g, "draw")
    .replace(/\bimag\b/g, "image")
    .replace(/\bpoto\b/g, "photo")
    .replace(/\bwalpaper\b/g, "wallpaper")
    .replace(/\bpik\b/g, "pick")
    .replace(/\bmakee\b/g, "make");

  // ===== SCENE LANGUAGE =====
  const scenePatterns = {
    locations:
      /\b(forest|jungle|mountain|beach|desert|ocean|city|street|temple|castle|palace|house|village|island|valley|canyon|volcano|waterfall|lake|river|space|moon|planet|garden|park)\b/i,

    weather:
      /\b(sunrise|sunset|dawn|dusk|night|day|raining|snowing|stormy|foggy|sunny|cloudy|moonlit|twilight)\b/i,

    atmosphere:
      /\b(mysterious|magical|peaceful|dramatic|epic|cinematic|majestic)\b/i,
  };

  // ===== ARTISTIC LANGUAGE =====
  const artisticPatterns = {
    styles:
      /\b(anime|manga|cartoon|illustration|digital art|oil painting|watercolor|sketch|drawing|painting|3d render|photorealistic|realistic|fantasy|sci-fi|cyberpunk)\b/i,

    visuals:
      /\b(colorful|vibrant|bright|dark|neon|glowing|detailed|sharp)\b/i,
  };

  // ===== CHARACTER LANGUAGE =====
  const characterPatterns = {
    humans:
      /\b(girl|boy|woman|man|person|character|portrait|face|female|male|lady|gentleman)\b/i,

    creatures:
      /\b(dragon|unicorn|phoenix|lion|tiger|cat|dog|wolf|alien|robot)\b/i,

    indianCharacters:
      /\b(krishna|radha|shiva|hanuman|indian woman|indian girl)\b/i,
  };

  // ===== DESIGN LANGUAGE =====
  const designPatterns = {
    purpose:
      /\b(wallpaper|background|poster|banner|icon|logo|design|avatar)\b/i,

    quality:
      /\b(high quality|4k|8k|hd|professional|cinematic|beautiful|stunning)\b/i,
  };

  // ===== CREATIVE LANGUAGE =====
  const creativePatterns = {
    creative:
      /\b(imagine|visualize|create|make|design|draw|render|generate|show me)\s+/i,
  };

  // ===== NEGATIVE PATTERNS =====
  const textQueryPatterns = {
    questions:
      /^(what|how|why|when|where|which|who|can you|could you|would you|should you|do you|did you|have you|will you|is|are|am)\b/i,

    technical:
      /\b(code|program|function|algorithm|equation|formula|math|database|syntax)\b/i,

    information:
      /\b(explain|describe|tell me about|information about)\b/i,
  };

  // ===== SCORING =====

  if (Object.values(scenePatterns).some((p) => p.test(correctedText))) {
    visualScore += 2.5;
    reasons.push("scene-language");
  }

  if (Object.values(artisticPatterns).some((p) => p.test(correctedText))) {
    visualScore += 2.5;
    reasons.push("artistic-language");
  }

  if (Object.values(characterPatterns).some((p) => p.test(correctedText))) {
    visualScore += 2.5;
    reasons.push("character-language");
  }

  if (Object.values(designPatterns).some((p) => p.test(correctedText))) {
    visualScore += 2;
    reasons.push("design-language");
  }

  if (Object.values(creativePatterns).some((p) => p.test(correctedText))) {
    visualScore += 2;
    reasons.push("creative-language");
  }

  // NEGATIVE SCORING
  if (textQueryPatterns.questions.test(correctedText)) {
    visualScore *= 0.3;
    reasons.push("text-query");
  }

  if (textQueryPatterns.technical.test(correctedText)) {
    visualScore *= 0.1;
    reasons.push("technical-query");
  }

  if (textQueryPatterns.information.test(correctedText)) {
    visualScore *= 0.5;
    reasons.push("information-query");
  }

  const confidence = Math.min(100, (visualScore / 5) * 100);
  const isVisual = visualScore >= 1.5;

  return {
    isVisual,
    confidence: Math.round(confidence),
    score: visualScore.toFixed(2),
    reasons,
  };
}

/**
 * Detect image generation requests
 */

export function isImageGenerationRequest(text) {
  if (!text || text.trim().length === 0) return false;

  const analysis = analyzeVisualIntent(text);

  console.log(`🎨 Visual Intent Analysis:
    Text: "${text.substring(0, 60)}..."
    Score: ${analysis.score}
    Confidence: ${analysis.confidence}%
    Reasons: ${analysis.reasons.join(", ")}
    Decision: ${analysis.isVisual ? "✅ IMAGE ROUTE" : "❌ TEXT ROUTE"}
  `);

  return analysis.isVisual;
}

/**
 * Enhance image prompt
 */

export function enhanceImagePrompt(prompt) {
  if (!prompt) return prompt;

  const lowerPrompt = prompt.toLowerCase();

  if (
    lowerPrompt.includes("4k") ||
    lowerPrompt.includes("hd") ||
    lowerPrompt.includes("quality") ||
    lowerPrompt.includes("cinematic")
  ) {
    return prompt;
  }

  const isSimple =
    prompt.length < 50 && prompt.split(" ").length < 15;

  if (isSimple) {
    return `${prompt}, high quality, professional artwork`;
  }

  return prompt;
}

/**
 * Generate image using Render backend
 */

export async function generateImage(prompt) {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Image prompt cannot be empty");
  }

  console.log("🎨 IMAGE GENERATION REQUEST");
  console.log(`Prompt: "${prompt}"`);

  try {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 90000);

    // ✅ FIXED URL
    const API_URL =
      "https://ronit-workspace-backend.onrender.com/api/generate-image";

    console.log(`Connecting to backend: ${API_URL}`);

    const response = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        prompt: enhanceImagePrompt(prompt),
      }),

      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(
      `Response status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({}));

      const errorMsg =
        errorData.error ||
        `Server Error: ${response.statusText}`;

      console.error(
        `❌ Backend error [${response.status}]: ${errorMsg}`
      );

      if (response.status === 500) {
        throw new Error(
          "Image generation service error. Please try again."
        );
      }

      if (response.status === 503) {
        throw new Error(
          "Image generation service temporarily unavailable."
        );
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (!data.image) {
      throw new Error(
        "Invalid response from backend: image missing"
      );
    }

    console.log("Converting image to Blob...");

    const imageResponse = await fetch(data.image);

    const blob = await imageResponse.blob();

    if (!blob || blob.size === 0) {
      throw new Error("Generated image is empty");
    }

    console.log("✅ Image generated successfully");

    return blob;
  } catch (error) {
    console.error("❌ Image Generation Error:", error);

    if (error.name === "AbortError") {
      throw new Error(
        "Image generation timed out. Please try again."
      );
    }

    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("ERR_CONNECTION_REFUSED")
    ) {
      throw new Error(
        "Cannot connect to image generation service. Please try again in a few seconds."
      );
    }

    throw error;
  }
}

/**
 * Blob to Data URL
 */

export async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = reject;

    reader.readAsDataURL(blob);
  });
}

/**
 * Download image
 */

export function downloadImage(
  blob,
  filename = "generated-image.png"
) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = filename;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Copy image to clipboard
 */

export async function copyImageToClipboard(blob) {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);

    return true;
  } catch (error) {
    throw new Error("Failed to copy image to clipboard");
  }
}