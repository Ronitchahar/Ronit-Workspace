/**
 * Advanced Context-Aware Intent Detection Service
 * Detects user intent based on uploaded files, message content, and conversation history
 * CRITICAL: If files/images are uploaded, default to ANALYSIS mode
 */

const SPELLING_CORRECTIONS = {
  'genrate': 'generate', 'craete': 'create', 'drow': 'draw', 'imag': 'image',
  'poto': 'photo', 'walpaper': 'wallpaper', 'pik': 'pick', 'makee': 'make',
  'creat': 'create', 'geenrate': 'generate', 'wallpapper': 'wallpaper',
};

/**
 * Correct common spelling mistakes in user text
 * @param {string} text - User message
 * @returns {string} - Text with corrected spellings
 */
export function correctSpelling(text) {
  if (!text) return text;
  
  let corrected = text.toLowerCase();
  Object.entries(SPELLING_CORRECTIONS).forEach(([wrong, right]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    corrected = corrected.replace(regex, right);
  });
  
  return corrected;
}

/**
 * Core Intent Detection Engine
 * DEFENSIVE: Strict null/empty/type checks throughout
 * @param {object} context - {text, uploadedFiles, uploadedImages, previousMessages}
 * @returns {object} - {intent, confidence, reason, details}
 */
export function detectUserIntent(context = {}) {
  // GUARD 1: Validate input object
  if (!context || typeof context !== 'object') {
    console.warn('[INTENT] Invalid context object, using defaults');
    context = {};
  }

  const {
    text = '',
    uploadedFiles = [],
    uploadedImages = [],
    previousMessages = []
  } = context;

  // GUARD 2: Defensive array validation
  const filesArray = Array.isArray(uploadedFiles) ? uploadedFiles : [];
  const imagesArray = Array.isArray(uploadedImages) ? uploadedImages : [];
  
  // GUARD 3: Strict file existence checks
  const hasValidImages = imagesArray.length > 0 && imagesArray.every(img => img instanceof Blob && img.size > 0);
  const hasValidFiles = filesArray.length > 0 && filesArray.every(f => f instanceof Blob && f.size > 0);
  const hasUploadedContent = hasValidImages || hasValidFiles;

  // GUARD 4: Text validation
  const cleanText = (typeof text === 'string' ? text : '').trim();

  // ====================================================
  // COMPREHENSIVE DEBUG LOGGING WITH DEFENSIVE CHECKS
  // ====================================================
  console.log(`
╔════════════════════════════════════════════════════════════╗
║          🔍 INTENT DETECTION ENGINE (DEFENSIVE)           ║
╚════════════════════════════════════════════════════════════╝
📝 TEXT INPUT:
   "${cleanText ? cleanText.substring(0, 80) : '(EMPTY)'}"
   Length: ${cleanText.length} chars
   
📊 FILE VALIDATION GATES:
   ✅ uploadedImages is array: ${Array.isArray(imagesArray)}
   ✅ uploadedImages count: ${imagesArray.length}
   ✅ All images are valid Blobs: ${hasValidImages}
   ${imagesArray.map((img, i) => `      [${i}] Blob check: ${img instanceof Blob ? 'YES' : 'NO'}, Size: ${img.size || 0}`).join('\n')}
   
   ✅ uploadedFiles is array: ${Array.isArray(filesArray)}
   ✅ uploadedFiles count: ${filesArray.length}
   ✅ All files are valid Blobs: ${hasValidFiles}
   ${filesArray.map((f, i) => `      [${i}] Blob check: ${f instanceof Blob ? 'YES' : 'NO'}, Size: ${f.size || 0}`).join('\n')}
   
🚨 CRITICAL GATES:
   hasValidImages: ${hasValidImages}
   hasValidFiles: ${hasValidFiles}
   hasUploadedContent: ${hasUploadedContent}
`);

  // ========================================
  // PRIORITY 1: FILE/IMAGE ANALYSIS
  // ========================================
  if (hasUploadedContent) {
    // GATE 1A: Image analysis
    if (hasValidImages) {
      console.log('[INTENT] ✅ IMAGE_ANALYSIS - Valid image blob uploaded');
      return {
        intent: 'IMAGE_ANALYSIS',
        confidence: 100,
        reason: 'valid-image-uploaded',
        details: 'User uploaded valid image file - automatic analysis mode'
      };
    }

    // GATE 1B: File type determination
    if (hasValidFiles) {
      const firstFile = filesArray[0];
      const fileType = firstFile.type || 'unknown';
      const isImageFile = fileType.startsWith('image/');
      
      if (isImageFile) {
        console.log('[INTENT] ✅ IMAGE_ANALYSIS - Valid image file detected');
        return {
          intent: 'IMAGE_ANALYSIS',
          confidence: 100,
          reason: 'image-file-uploaded',
          details: 'User uploaded image file - automatic analysis mode'
        };
      }

      // Non-image document
      console.log('[INTENT] ✅ FILE_ANALYSIS - Valid document file detected');
      return {
        intent: 'FILE_ANALYSIS',
        confidence: 100,
        reason: 'document-file-uploaded',
        details: `User uploaded ${fileType} - document analysis mode`
      };
    }
  }

  // ========================================
  // PRIORITY 2: TEXT-BASED INTENT (NO FILES)
  // ========================================
  // GUARD 5: Empty text with no files → NORMAL_CHAT (never analysis)
  if (!cleanText) {
    console.log('[INTENT] ❌ NO TEXT, NO FILES → defaulting to NORMAL_CHAT');
    return {
      intent: 'NORMAL_CHAT',
      confidence: 0,
      reason: 'empty-message-no-files',
      details: 'Empty message with no uploaded files'
    };
  }

  // Analyze text for intent
  const intentAnalysis = analyzeTextIntent(cleanText);
  
  console.log(`[INTENT] Text Analysis Complete:
    - Intent: ${intentAnalysis.intent}
    - Confidence: ${intentAnalysis.confidence}%
    - Reasons: ${intentAnalysis.reasons.join(', ')}`);

  return intentAnalysis;
}

/**
 * Analyze text-based intent
 * @param {string} text - Corrected user message
 * @returns {object} - Intent analysis
 */
function analyzeTextIntent(text) {
  const lowerText = text.toLowerCase();
  let generationScore = 0;
  let analysisScore = 0;
  const reasons = [];

  // ===== GENERATION INTENT PATTERNS =====
  const generationPatterns = {
    // Explicit generation requests
    createGeneration: /\b(generate|create|make|draw|paint|render|design|build|compose|craft|produce|imagine|envision|picture|visualize|show me)\b/i,
    
    // Subject nouns (what to generate)
    subjects: /\b(wallpaper|background|poster|banner|image|picture|photo|artwork|icon|logo|avatar|portrait|character|creature|animal|person|scene|landscape|cityscape|room|building|art|design|concept|style)\b/i,
    
    // Visual descriptors
    visualDescriptors: /\b(anime|cartoon|cartoon|digital art|illustration|cyberpunk|steampunk|fantasy|sci-fi|realistic|photorealistic|oil painting|watercolor|pixel art|3d render|neon|gothic|retro|vintage|modern|minimalist)\b/i,
    
    // Quality/style modifiers
    qualityModifiers: /\b(high quality|4k|8k|hd|ultra hd|professional|cinematic|epic|stunning|beautiful|amazing|incredible|awesome|gorgeous|magnificent|detailed|intricate)\b/i,
    
    // Common wallpaper requests
    wallpaperTerms: /\b(wallpaper|desktop|mobile|phone|background|lock screen|home screen|screen saver)\b/i,
    
    // Image enhancement
    enhancementTerms: /\b(enhance|upscale|sharpen|improve|make hd|restore|fix|clean|remove blur|remove background|upscale|cartoonify|anime)\b/i,
  };

  // ===== ANALYSIS INTENT PATTERNS =====
  const analysisPatterns = {
    // Explicit analysis questions
    analyzeQuestions: /\b(what is|what's|explain|describe|analyze|tell me about|what about|read|scan|ocr|extract|understand|interpret|break down|summarize|summarise)\b/i,
    
    // Problem-solving
    problemSolving: /\b(solve|answer|help|figure out|work out|calculate|compute|determine|find|solve|show me how)\b/i,
    
    // Clarification requests
    clarification: /\b(what|who|when|where|why|how|which|whose)\b.*\b(this|that|is|are|do|does)\b/i,
    
    // Document/content requests
    documentRequests: /\b(extract|read|summarize|translate|transcribe|convert|parse)\b/i,
  };

  // Score generation intent
  if (generationPatterns.createGeneration.test(lowerText)) {
    generationScore += 3;
    reasons.push('generation-verb');
  }
  if (generationPatterns.subjects.test(lowerText)) {
    generationScore += 2;
    reasons.push('visual-subject');
  }
  if (generationPatterns.visualDescriptors.test(lowerText)) {
    generationScore += 2.5;
    reasons.push('visual-descriptor');
  }
  if (generationPatterns.qualityModifiers.test(lowerText)) {
    generationScore += 1;
    reasons.push('quality-modifier');
  }
  if (generationPatterns.wallpaperTerms.test(lowerText)) {
    generationScore += 2;
    reasons.push('wallpaper-term');
  }
  if (generationPatterns.enhancementTerms.test(lowerText)) {
    generationScore += 1.5;
    reasons.push('enhancement-term');
  }

  // Score analysis intent
  if (analysisPatterns.analyzeQuestions.test(lowerText)) {
    analysisScore += 3;
    reasons.push('analysis-question');
  }
  if (analysisPatterns.problemSolving.test(lowerText)) {
    analysisScore += 2;
    reasons.push('problem-solving');
  }
  if (analysisPatterns.clarification.test(lowerText)) {
    analysisScore += 2;
    reasons.push('clarification');
  }
  if (analysisPatterns.documentRequests.test(lowerText)) {
    analysisScore += 3;
    reasons.push('document-request');
  }

  // Determine final intent
  const totalScore = generationScore + analysisScore;
  const generationConfidence = totalScore > 0 ? Math.round((generationScore / totalScore) * 100) : 0;
  const analysisConfidence = totalScore > 0 ? Math.round((analysisScore / totalScore) * 100) : 0;

  let intent = 'NORMAL_CHAT';
  let confidence = 0;
  
  if (generationScore >= 1.5 && generationScore > analysisScore) {
    intent = 'IMAGE_GENERATION';
    confidence = generationConfidence;
  } else if (analysisScore >= 1 && analysisScore > generationScore) {
    intent = 'IMAGE_ANALYSIS';
    confidence = analysisConfidence;
  } else {
    intent = 'NORMAL_CHAT';
    confidence = 0;
  }

  return {
    intent,
    confidence: Math.round(confidence),
    score: (totalScore).toFixed(2),
    generationScore: generationScore.toFixed(2),
    analysisScore: analysisScore.toFixed(2),
    reasons,
    details: `Generation: ${generationScore.toFixed(2)}, Analysis: ${analysisScore.toFixed(2)}`
  };
}

/**
 * SAFETY: False positive protection
 * Ensure these queries NEVER call generation API
 * @param {string} text - User message
 * @returns {boolean} - True if this should definitely NOT generate
 */
export function shouldBlockGeneration(text) {
  const blockPatterns = [
    /explain\s+(this\s+)?image/i,
    /analyze\s+(this\s+)?image/i,
    /what\s+is\s+(this|that)\s+(image|photo|picture)/i,
    /solve\s+(this\s+)?screenshot/i,
    /read\s+(this|that)\s+(image|document|pdf)/i,
    /summarize\s+(this|that)\s+(pdf|document|file)/i,
    /extract\s+text/i,
    /ocr/i,
    /transcribe/i,
    /convert\s+(image|pdf)/i,
  ];

  return blockPatterns.some(pattern => pattern.test(text));
}

/**
 * Validate intent before routing
 * @param {object} intentResult - Result from detectUserIntent
 * @returns {boolean} - True if intent is valid and should proceed
 */
export function isValidIntent(intentResult) {
  if (!intentResult || !intentResult.intent) {
    return false;
  }

  const validIntents = ['IMAGE_GENERATION', 'IMAGE_ANALYSIS', 'FILE_ANALYSIS', 'NORMAL_CHAT'];
  return validIntents.includes(intentResult.intent);
}
