/**
 * Image Analysis Service - Real Multimodal Vision Support
 * Supports image analysis, OCR, document understanding, and more
 * CRITICAL: Ensures consistent image understanding
 */

/**
 * Convert file to base64 for API transmission
 * Returns FULL data URL format for OpenRouter
 * ENSURES proper format validation
 * @param {Blob|File} file - Image file
 * @returns {Promise<string>} - Full data URL: data:image/png;base64,...
 */
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!file || !(file instanceof Blob)) {
      reject(new Error('Invalid file: must be a Blob or File object'));
      return;
    }
    
    if (file.size === 0) {
      reject(new Error('File is empty - cannot convert to base64'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result;
      
      // Validate result
      if (!result || typeof result !== 'string') {
        reject(new Error('Failed to read file - result is invalid'));
        return;
      }
      
      if (!result.startsWith('data:')) {
        reject(new Error('Base64 conversion failed - invalid format'));
        return;
      }
      
      // Return full data URL for OpenRouter (includes data:image/...;base64, prefix)
      resolve(result);
    };
    
    reader.onerror = () => {
      reject(new Error(`FileReader error: ${reader.error?.name || 'Unknown'}`));
    };
    
    reader.onabort = () => {
      reject(new Error('FileReader operation aborted'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * ENSURES image is valid before processing
 * @param {File} file - Image file
 * @returns {object} - {valid: boolean, error?: string, mimeType?: string}
 */
export function validateImageFile(file) {
  const validMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
    'image/gif', 'image/bmp', 'image/svg+xml'
  ];

  // Check 1: File exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check 2: Is a Blob instance
  if (!(file instanceof Blob)) {
    return { valid: false, error: 'File is not a valid Blob object' };
  }

  // Check 3: Has size
  if (!file.size || file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  // Check 4: Has valid MIME type
  if (!file.type) {
    return { valid: false, error: 'File MIME type is missing' };
  }

  if (!validMimeTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid image format: ${file.type}. Supported: JPEG, PNG, WebP, GIF, BMP, SVG` 
    };
  }

  // Check 5: File size limit
  if (file.size > 20 * 1024 * 1024) {
    return { 
      valid: false, 
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 20MB limit` 
    };
  }

  return { valid: true, mimeType: file.type };
}

/**
 * Analyze image with vision model
 * CRITICAL: Ensures image is ALWAYS sent to AI model correctly
 * @param {File|Blob} imageFile - Image file
 * @param {string} userMessage - User's question/instruction
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<string>} - Analysis response
 */
export async function analyzeImage(imageFile, userMessage = '', conversationHistory = []) {
  try {
    console.log('[IMAGE_ANALYSIS] ═══════════════════════════════════════════════════════════');
    console.log('[IMAGE_ANALYSIS] Starting image analysis...');

    // VALIDATE: Image file exists and is valid
    const validation = validateImageFile(imageFile);
    if (!validation.valid) {
      console.error('[IMAGE_ANALYSIS] ❌ Image validation failed:', validation.error);
      throw new Error(validation.error);
    }

    console.log('[IMAGE_ANALYSIS] ✅ Image validation passed');
    console.log('[IMAGE_ANALYSIS] File size:', (imageFile.size / 1024).toFixed(2), 'KB');
    console.log('[IMAGE_ANALYSIS] MIME type:', validation.mimeType);

    // CONVERT: Image to base64 with validation
    console.log('[IMAGE_ANALYSIS] Converting image to base64...');
    let dataUrlImage;
    try {
      dataUrlImage = await fileToBase64(imageFile);
    } catch (conversionError) {
      console.error('[IMAGE_ANALYSIS] ❌ Base64 conversion failed:', conversionError.message);
      throw new Error(`Failed to convert image: ${conversionError.message}`);
    }

    const mediaType = validation.mimeType;

    // VALIDATE: Base64 conversion result
    if (!dataUrlImage) {
      throw new Error('Base64 conversion returned empty result');
    }
    
    if (!dataUrlImage.startsWith('data:image/')) {
      console.error('[IMAGE_ANALYSIS] ❌ Invalid data URL format:', dataUrlImage.substring(0, 50));
      throw new Error('Image data URL has invalid format');
    }

    console.log('[IMAGE_ANALYSIS] ✅ Image converted to base64');
    console.log('[IMAGE_ANALYSIS] Data URL length:', (dataUrlImage.length / 1024).toFixed(2), 'KB');
    console.log('[IMAGE_ANALYSIS] Data URL format:', dataUrlImage.substring(0, 50) + '...');

    // Prepare the message with fallback
    const finalMessage = userMessage && userMessage.trim().length > 0 
      ? userMessage 
      : 'Please analyze this image and provide a detailed description.';

    console.log('[IMAGE_ANALYSIS] 📸 MULTIMODAL VISION REQUEST');
    console.log('[IMAGE_ANALYSIS] Message:', finalMessage.substring(0, 100) + '...');
    console.log('[IMAGE_ANALYSIS] Image type:', mediaType);

    // VALIDATE: API Key
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const model = import.meta.env.VITE_OPENROUTER_MODEL || 'gpt-4o-mini';
    console.log('[IMAGE_ANALYSIS] Using model:', model);

    // BUILD: Messages with vision payload (OpenRouter format)
    const messages = [];

    // Add conversation history if available
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        if (msg && msg.role && msg.content) {
          messages.push(msg);
        }
      });
    }

    // Add current user message with image in proper multimodal format
    const userMessagePayload = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: finalMessage
        },
        {
          type: 'image_url',
          image_url: {
            url: dataUrlImage  // Full data URL with base64
          }
        }
      ]
    };

    messages.push(userMessagePayload);

    // VALIDATE: Message payload
    if (!userMessagePayload.content || userMessagePayload.content.length < 2) {
      throw new Error('Failed to construct multimodal message payload');
    }

    console.log('[IMAGE_ANALYSIS] ✅ Multimodal payload constructed');
    console.log('[IMAGE_ANALYSIS] Payload parts:', userMessagePayload.content.length);
    console.log('[IMAGE_ANALYSIS] Has text:', userMessagePayload.content.some(c => c.type === 'text'));
    console.log('[IMAGE_ANALYSIS] Has image_url:', userMessagePayload.content.some(c => c.type === 'image_url'));

    // System prompt for multimodal AI
    const systemPrompt = `You are a multimodal AI assistant with advanced image understanding capabilities.
You can accurately analyze photographs, screenshots, diagrams, charts, documents, memes, artwork, handwriting, and any other visual content.
You ALWAYS provide complete, detailed responses to image analysis requests.
You NEVER respond with limitation messages about not being able to see or analyze images.
Always assume the image has been successfully transmitted and process it thoroughly.`;

    const requestBody = {
      model,
      messages,
      system: systemPrompt,
      temperature: 0.7,
      max_tokens: 2000
    };

    console.log('[IMAGE_ANALYSIS] Sending request to OpenRouter...');
    console.log('[IMAGE_ANALYSIS] Request model:', model);
    console.log('[IMAGE_ANALYSIS] Total messages:', messages.length);
    console.log('[IMAGE_ANALYSIS] System prompt optimized: YES');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : '',
        'X-Title': 'Ronit AI Assistant'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[IMAGE_ANALYSIS] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[IMAGE_ANALYSIS] ❌ API Error:', errorData);
      const errorMessage = errorData.error?.message || `API Error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[IMAGE_ANALYSIS] Response received successfully');
    
    // EXTRACT: Analysis result with validation
    const analysisResult = data.choices?.[0]?.message?.content;

    if (!analysisResult) {
      console.error('[IMAGE_ANALYSIS] ❌ No content in response:', data);
      throw new Error('No response from vision model');
    }

    // VALIDATE: Response is not a limitation message (these are failures)
    const fakeLimitationPhrases = [
      'cannot view images',
      'cannot analyze images',
      'cannot see the image',
      'i cannot view',
      'i cannot analyze',
      'unable to view',
      'unable to analyze',
      'no image provided',
      'no image attached',
      'i don\'t see an image',
      'there is no image',
      'no image was'
    ];

    const lowerResponse = analysisResult.toLowerCase();
    if (fakeLimitationPhrases.some(phrase => lowerResponse.includes(phrase))) {
      console.error('[IMAGE_ANALYSIS] ❌ Model returned limitation message');
      console.error('[IMAGE_ANALYSIS] This means the image was NOT processed');
      console.error('[IMAGE_ANALYSIS] Response was:', analysisResult);
      throw new Error('Vision model failed to process image. This is a model limitation or network issue.');
    }

    console.log('[IMAGE_ANALYSIS] ✅ Analysis complete and valid');
    console.log('[IMAGE_ANALYSIS] Response length:', analysisResult.length);
    console.log('[IMAGE_ANALYSIS] Response preview:', analysisResult.substring(0, 100) + '...');
    console.log('[IMAGE_ANALYSIS] ═══════════════════════════════════════════════════════════');
    
    return analysisResult;
  } catch (error) {
    console.error('[IMAGE_ANALYSIS] ❌ Error:', error.message);
    console.error('[IMAGE_ANALYSIS] Error type:', error.constructor.name);
    console.error('[IMAGE_ANALYSIS] Stack:', error.stack);
    throw error;
  }
}

/**
 * Extract text from image using OCR
 * @param {File|Blob} imageFile - Image file
 * @returns {Promise<string>} - Extracted text
 */
export async function extractTextFromImage(imageFile) {
  const message = 'Extract all text from this image. Preserve the original formatting and structure. If there are multiple sections, clearly separate them.';
  return analyzeImage(imageFile, message);
}

/**
 * Describe image in detail
 * @param {File|Blob} imageFile - Image file
 * @returns {Promise<string>} - Image description
 */
export async function describeImage(imageFile) {
  const message = 'Provide a detailed, comprehensive description of this image. Include colors, objects, people, text, composition, mood, and any other relevant details.';
  return analyzeImage(imageFile, message);
}

/**
 * Solve problem/question from image (screenshot)
 * @param {File|Blob} imageFile - Image file (screenshot, problem, etc.)
 * @returns {Promise<string>} - Solution/answer
 */
export async function solveQuestionFromImage(imageFile) {
  const message = 'This image contains a question or problem. Please solve it step-by-step and provide the complete solution with explanation.';
  return analyzeImage(imageFile, message);
}

/**
 * Detect objects in image
 * @param {File|Blob} imageFile - Image file
 * @returns {Promise<string>} - List of detected objects
 */
export async function detectObjects(imageFile) {
  const message = 'List all objects, people, animals, text, and items visible in this image. Be comprehensive and specific.';
  return analyzeImage(imageFile, message);
}

/**
 * Analyze screenshot (often code, UI, or documents)
 * @param {File|Blob} imageFile - Screenshot
 * @param {string} context - Additional context about the screenshot
 * @returns {Promise<string>} - Analysis
 */
export async function analyzeScreenshot(imageFile, context = '') {
  const message = context 
    ? `Analyze this screenshot: ${context}`
    : 'Analyze this screenshot and explain what you see. Describe the UI, content, and any text visible.';
  return analyzeImage(imageFile, message);
}

/**
 * Explain diagram or chart
 * @param {File|Blob} imageFile - Diagram/chart image
 * @returns {Promise<string>} - Explanation
 */
export async function explainDiagram(imageFile) {
  const message = 'This image contains a diagram, chart, or flowchart. Please explain what it shows, what each component represents, and how they relate to each other.';
  return analyzeImage(imageFile, message);
}

/**
 * Analyze document page (PDF converted to image, etc.)
 * @param {File|Blob} imageFile - Document page
 * @returns {Promise<string>} - Document analysis
 */
export async function analyzeDocumentPage(imageFile) {
  const message = 'This image is a scanned document or document page. Please read and summarize all the content, extract key information, and identify the document type.';
  return analyzeImage(imageFile, message);
}

/**
 * Read handwritten text
 * @param {File|Blob} imageFile - Image with handwriting
 * @returns {Promise<string>} - Extracted handwritten text
 */
export async function readHandwriting(imageFile) {
  const message = 'This image contains handwritten text. Please read and transcribe all the handwriting accurately.';
  return analyzeImage(imageFile, message);
}

/**
 * Get image caption/alt text
 * @param {File|Blob} imageFile - Image file
 * @returns {Promise<string>} - Image caption
 */
export async function getCaptionForImage(imageFile) {
  const message = 'Generate a short, concise caption (1-2 sentences) that describes this image for accessibility purposes.';
  return analyzeImage(imageFile, message);
}

/**
 * Analyze image and return structured data
 * @param {File|Blob} imageFile - Image file
 * @param {string} analysisType - Type of analysis (ocr, objects, description, etc.)
 * @returns {Promise<string>} - Analysis result
 */
export async function analyzeImageStructured(imageFile, analysisType = 'description') {
  const analyses = {
    ocr: () => extractTextFromImage(imageFile),
    text: () => extractTextFromImage(imageFile),
    description: () => describeImage(imageFile),
    describe: () => describeImage(imageFile),
    objects: () => detectObjects(imageFile),
    solve: () => solveQuestionFromImage(imageFile),
    problem: () => solveQuestionFromImage(imageFile),
    screenshot: () => analyzeScreenshot(imageFile),
    diagram: () => explainDiagram(imageFile),
    document: () => analyzeDocumentPage(imageFile),
    handwriting: () => readHandwriting(imageFile),
    caption: () => getCaptionForImage(imageFile),
  };

  const analyzer = analyses[analysisType.toLowerCase()] || analyses.description;
  return analyzer();
}
