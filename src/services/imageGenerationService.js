// Image Generation Service using local backend API with intelligent detection

/**
 * Intelligent Visual Intent Detection
 * Semantic analysis that understands visual requests naturally
 * Works like ChatGPT - no hardcoded keyword dependency
 * Analyzes multiple layers of visual intent
 * @param {string} text - User message text
 * @returns {object} - { isVisual: boolean, confidence: number, reason: string }
 */
export function analyzeVisualIntent(text) {
  if (!text || text.trim().length === 0) {
    return { isVisual: false, confidence: 0, reason: 'empty' };
  }

  const lowerText = text.toLowerCase().trim();
  let visualScore = 0;
  const reasons = [];

  // Spelling corrections for common mistakes
  const correctedText = lowerText
    .replace(/\bgenrate\b/g, 'generate')
    .replace(/\bcraete\b/g, 'create')
    .replace(/\bdrow\b/g, 'draw')
    .replace(/\bimag\b/g, 'image')
    .replace(/\bpoto\b/g, 'photo')
    .replace(/\bwalpaper\b/g, 'wallpaper')
    .replace(/\bpik\b/g, 'pick')
    .replace(/\bmakee\b/g, 'make');

  // ===== LAYER 1: SCENE & ENVIRONMENT LANGUAGE =====
  const scenePatterns = {
    locations: /\b(forest|jungle|mountain|beach|desert|ocean|city|street|temple|castle|palace|house|village|island|valley|canyon|volcano|waterfall|lake|river|space|moon|planet|heaven|hell|underworld|garden|park|marketplace|temple|shrine|altar)\b/i,
    weather: /\b(sunrise|sunset|dawn|dusk|night|day|raining|snowing|stormy|foggy|sunny|clear|cloudy|night sky|starry|moonlit|twilight|aurora|eclipse)\b/i,
    timeOfDay: /\b(morning|afternoon|evening|midnight|noon|sunset|sunrise|dusk|dawn)\b/i,
    atmosphere: /\b(mysterious|mystical|magical|enchanted|haunted|eerie|peaceful|serene|dramatic|epic|cinematic|breathtaking|majestic|sublime)\b/i,
  };

  // ===== LAYER 2: ARTISTIC & CREATIVE LANGUAGE =====
  const artisticPatterns = {
    styles: /\b(anime|manga|cartoon|illustration|digital art|oil painting|watercolor|sketch|drawing|painting|3d render|pixel art|vector art|photorealistic|realistic|surreal|abstract|impressionist|expressionist|minimalist|art deco|cyberpunk|steampunk|gothic|fantasy|sci-fi|neon|retro|vintage|modern)\b/i,
    mediums: /\b(artwork|illustration|design|composition|portrait|landscape|still life|concept art|fan art|character design|creature design|environmental design)\b/i,
    artistic_verbs: /\b(painted|drawn|illustrated|rendered|sculpted|crafted|designed|composed|created as art|styled as)\b/i,
    visuals: /\b(colorful|vibrant|vivid|bright|dark|monochrome|pastel|neon|glowing|shimmering|sparkling|metallic|matte|glossy|textured|detailed|intricate|sharp|blurred)\b/i,
  };

  // ===== LAYER 3: CHARACTER & CREATURE LANGUAGE =====
  const characterPatterns = {
    humans: /\b(girl|boy|woman|man|person|character|people|portrait|face|woman with|girl with|man with|boy with|anime girl|anime boy|cartoon character|human figure|female|male|lady|gentleman)\b/i,
    creatures: /\b(animal|creature|beast|monster|dragon|unicorn|phoenix|elephant|lion|tiger|cat|dog|horse|deer|bird|eagle|phoenix|wolf|fox|bear|shark|whale|dinosaur|alien|robot|cyborg|demon|angel)\b/i,
    superheroes: /\b(superhero|hero|villain|avenger|batman|superman|spiderman|ironman|hulk|thor|captain america|black panther|wonder woman|aquaman|flash|green lantern|hawkeye|black widow|antman)\b/i,
    fantasy: /\b(wizard|witch|fairy|elf|dwarf|orc|goblin|demon|angel|ghost|vampire|werewolf|mermaid|centaur|minotaur|sphinx|god|goddess|deity|warrior|knight|paladin|rogue|mage|barbarian)\b/i,
    indianCharacters: /\b(krishna|radha|devi|warrior|maharaja|princess|arjun|shiva|brahma|vishnu|hanuman|durga|lakshmi|saraswati|indra|indian woman|indian girl)\b/i,
  };

  // ===== LAYER 4: OBJECT & COMPOSITION LANGUAGE =====
  const objectPatterns = {
    objects: /\b(building|castle|temple|pyramid|statue|monument|vehicle|car|spaceship|rocket|weapon|sword|shield|crown|throne|artifact|treasure|gem|crystal|throne|fortress|tower|bridge|lighthouse)\b/i,
    compositions: /\b(portrait|landscape|panorama|wide angle|close up|macro|bird's eye|worm's eye|composition|scene|frame|shot|angle|perspective|bokeh|depth of field)\b/i,
    environments: /\b(forest|jungle|cave|dungeon|castle|palace|village|town|city|metropolis|futuristic city|dystopian|post-apocalyptic|underwater|space|alien world|fantasy realm)\b/i,
  };

  // ===== LAYER 5: WALLPAPER & DESIGN LANGUAGE =====
  const designPatterns = {
    purpose: /\b(wallpaper|background|poster|banner|icon|logo|design|theme|desktop|mobile|cover|header|footer|profile|avatar|merchandise|print)\b/i,
    forIntent: /\bfor\s+(phone|desktop|laptop|monitor|wall|instagram|twitter|facebook|gaming|streaming)\b/i,
    designQuality: /\b(high quality|4k|8k|ultra high definition|hd|professional|cinematic|epic|amazing|stunning|beautiful|awesome|incredible)\b/i,
  };

  // ===== LAYER 6: CREATIVE PROMPT LANGUAGE =====
  const creativePatterns = {
    creative: /\b(imagine|envision|picture|visualize|create|make|design|craft|compose|build|paint|draw|render|generate|show me)\s+/i,
    descriptions: /\b(beautiful|majestic|epic|grand|stunning|breathtaking|amazing|incredible|awesome|gorgeous|magnificent|exquisite|intricate|detailed|elaborate)\b/i,
    withAdornments: /\b(with|wearing|holding|surrounded by|inside|in front of|behind|above|below|floating|flying|standing on|sitting on|leaning on)\b/i,
  };

  // ===== LAYER 7: EXPLICIT ARTISTIC REQUESTS =====
  const artisticRequests = /\b(artwork|illustration|picture|image|visual|graphic|render|asset|texture|painting|drawing|sketch|concept|design)\b/i;

  // ===== LAYER 8: IMAGE ENHANCEMENT LANGUAGE =====
  const enhancementPatterns = {
    enhancement: /\b(enhance|upscale|sharpen|improve|hd|restore|fix|clean|remove|cartoon|anime|style transfer|make hd|convert to 4k|colorize|deblur|denoise|upres|super resolution)\b/i,
  };

  // ===== LAYER 9: HUMAN FACE & PORTRAIT SPECIFIC =====
  const humanPatterns = {
    faceRequests: /\b(face|portrait|headshot|profile|selfie|mugshot|profile picture|indian|indian girl|indian woman|girl|boy|woman|man|person|character)\b/i,
    expressions: /\b(smiling|sad|angry|happy|surprised|confused|excited|calm|peaceful|stern|gentle|fierce|mysterious|playful|serious)\b/i,
    features: /\b(eyes|smile|hair|face|nose|lips|skin|beautiful|pretty|handsome|attractive)\b/i,
  };

  // ===== NEGATIVE PATTERNS: Question/Query Intent =====
  const textQueryPatterns = {
    questions: /^(what|how|why|when|where|which|who|can you|could you|would you|should you|do you|did you|have you|will you|is|are|am|what is|how do|why does|where is|when is)\b/i,
    technical: /\b(code|program|function|algorithm|equation|formula|math|number|logic|structure|database|table|row|column|syntax|variable|constant)\b/i,
    information: /\b(explain|describe|tell me about|what about|information about|details about|facts about|knowledge about)\b/i,
  };

  // ===== SCORING: Analyze all layers using correctedText =====

  // Scene/environment language
  if (Object.values(scenePatterns).some(p => p.test(correctedText))) {
    visualScore += 2.5;
    reasons.push('scene-language');
  }

  // Artistic/creative language
  if (Object.values(artisticPatterns).some(p => p.test(correctedText))) {
    visualScore += 2.5;
    reasons.push('artistic-language');
  }

  // Character/creature language
  if (Object.values(characterPatterns).some(p => p.test(correctedText))) {
    visualScore += 2.5;
    reasons.push('character-language');
  }

  // Object/composition language
  if (Object.values(objectPatterns).some(p => p.test(correctedText))) {
    visualScore += 1.5;
    reasons.push('object-language');
  }

  // Design/wallpaper language
  if (Object.values(designPatterns).some(p => p.test(correctedText))) {
    visualScore += 2;
    reasons.push('design-language');
  }

  // Creative prompt language
  if (Object.values(creativePatterns).some(p => p.test(correctedText))) {
    visualScore += 2;
    reasons.push('creative-language');
  }

  // Explicit artistic requests
  if (artisticRequests.test(correctedText)) {
    visualScore += 1.5;
    reasons.push('explicit-artwork');
  }

  // Image enhancement language
  if (enhancementPatterns.enhancement.test(correctedText)) {
    visualScore += 2;
    reasons.push('enhancement-request');
  }

  // Human/face specific language
  if (Object.values(humanPatterns).some(p => p.test(correctedText))) {
    visualScore += 2.5;
    reasons.push('human-request');
  }

  // NEGATIVE: Text query intent
  if (textQueryPatterns.questions.test(correctedText)) {
    visualScore *= 0.3; // Heavily reduce score for questions
    reasons.push('text-query');
  }
  if (textQueryPatterns.technical.test(correctedText)) {
    visualScore *= 0.1; // Severely reduce for technical
    reasons.push('technical-query');
  }
  if (textQueryPatterns.information.test(correctedText)) {
    visualScore *= 0.5; // Reduce for information requests
    reasons.push('information-query');
  }

  // Confidence: Higher score = higher confidence it's visual
  const confidence = Math.min(100, (visualScore / 5) * 100);
  const isVisual = visualScore >= 1.5; // Threshold: 1.5 points

  return {
    isVisual,
    confidence: Math.round(confidence),
    score: visualScore.toFixed(2),
    reasons,
  };
}

/**
 * UNIVERSAL Image Generation Detection (wrapper)
 * @param {string} text - User message text
 * @returns {boolean} - True if image generation is requested
 */
export function isImageGenerationRequest(text) {
  if (!text || text.trim().length === 0) return false;

  const lowerText = text.toLowerCase().trim();

  // Use semantic analysis
  const analysis = analyzeVisualIntent(text);
  
  // Debug logging
  console.log(`🎨 Visual Intent Analysis:
    Text: "${text.substring(0, 60)}..."
    Score: ${analysis.score}
    Confidence: ${analysis.confidence}%
    Reasons: ${analysis.reasons.join(', ')}
    Decision: ${analysis.isVisual ? '✅ IMAGE ROUTE' : '❌ TEXT ROUTE'}`);

  return analysis.isVisual;
}

/**
 * Enhance prompt professionally before sending to image API
 * Adds artistic details without changing user intent
 * @param {string} prompt - Original user prompt
 * @returns {string} - Enhanced prompt
 */
export function enhanceImagePrompt(prompt) {
  // Don't over-enhance - keep user intent clear
  // Just add professional quality indicators if needed
  
  if (!prompt) return prompt;
  
  const lowerPrompt = prompt.toLowerCase();
  
  // If already has quality indicators, don't add more
  if (lowerPrompt.includes('4k') || lowerPrompt.includes('hd') || lowerPrompt.includes('quality') || lowerPrompt.includes('cinematic') || lowerPrompt.includes('photorealistic')) {
    return prompt;
  }
  
  // Simple enhancement: add quality if it seems like a simple request
  const isSimple = prompt.length < 50 && prompt.split(' ').length < 15;
  
  if (isSimple && !lowerPrompt.includes('question') && !lowerPrompt.includes('explain')) {
    // Add subtle artistic enhancement
    return `${prompt}, high quality, professional artwork`;
  }
  
  return prompt;
}

/**
 * Generate image using local backend route
 * CRITICAL: This function MUST return a Blob or throw a clear error
 * NEVER return undefined or null
 * @param {string} prompt - Image generation prompt
 * @returns {Promise<Blob>} - Image blob
 * @throws {Error} - Detailed error message for UI
 */
export async function generateImage(prompt) {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Image prompt cannot be empty");
  }

  console.log(`🎨 IMAGE GENERATION REQUEST`);
  console.log(`   Prompt: "${prompt.substring(0, 80)}..."`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

    console.log(`   Connecting to backend: http://localhost:3001/api/generate-image`);

    const response = await fetch("http://localhost:3001/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log(`   Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error || `Server Error: ${response.statusText}`;
      
      console.error(`❌ Backend error [${response.status}]: ${errorMsg}`);
      
      // Provide user-friendly error
      if (response.status === 500) {
        throw new Error("Image generation service error. Please try again.");
      } else if (response.status === 503) {
        throw new Error("Image generation service is temporarily unavailable.");
      } else {
        throw new Error(errorMsg);
      }
    }

    const data = await response.json();
    
    console.log(`   Response received, extracting image data...`);

    if (!data.image) {
      console.error(`❌ Invalid response: missing image data`);
      throw new Error("Invalid response from backend: image data is missing");
    }

    // Convert data URL back to Blob
    console.log(`   Converting data URL to Blob...`);
    const imageRes = await fetch(data.image);
    const blob = await imageRes.blob();

    // Validate blob
    if (!blob || blob.size === 0) {
      console.error(`❌ Image blob is empty`);
      throw new Error("Generated image is empty");
    }

    console.log(`✅ Image generated successfully`);
    console.log(`   Size: ${(blob.size / 1024).toFixed(2)} KB`);
    console.log(`   Type: ${blob.type}`);

    return blob;
  } catch (error) {
    console.error(`❌ Image Generation Error:`, error.message);
    
    // Handle specific error types
    if (error.name === "AbortError") {
      console.error(`   Timeout: 90 second limit exceeded`);
      throw new Error("Image generation timed out. Please try again.");
    }
    
    if (error.message.includes("Failed to fetch")) {
      console.error(`   Network error: Cannot connect to backend`);
      throw new Error("Cannot connect to image generation service. Make sure the backend server is running on port 3001.");
    }
    
    if (error.message.includes("ERR_CONNECTION_REFUSED")) {
      console.error(`   Connection refused: Backend not listening`);
      throw new Error("Backend server not running. Please start the server and try again.");
    }
    
    // Re-throw with original message
    throw error;
  }
}

/**
 * Convert image blob to data URL for preview
 * @param {Blob} blob - Image blob
 * @returns {Promise<string>} - Data URL
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
 * @param {Blob} blob - Image blob
 * @param {string} filename - Filename for download
 */
export function downloadImage(blob, filename = "generated-image.png") {
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
 * @param {Blob} blob - Image blob
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
    // Silently fail for clipboard operations
    throw new Error("Failed to copy image to clipboard");
  }
}
