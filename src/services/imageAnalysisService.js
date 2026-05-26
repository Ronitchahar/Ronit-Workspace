/**
 * Image Analysis Service - Real Multimodal Vision Support
 * Supports image analysis, OCR, document understanding, and more
 */

/**
 * Convert file to base64 for API transmission
 * Returns FULL data URL format for OpenRouter
 * @param {Blob|File} file - Image file
 * @returns {Promise<string>} - Full data URL: data:image/png;base64,...
 */
export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      // Return full data URL for OpenRouter (includes data:image/...;base64, prefix)
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file
 * @param {File} file - Image file
 * @returns {object} - {valid: boolean, error?: string, mimeType?: string}
 */
export function validateImageFile(file) {
  const validMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
    'image/gif', 'image/bmp', 'image/svg+xml'
  ];

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!validMimeTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid image format. Supported: JPEG, PNG, WebP, GIF, BMP, SVG` 
    };
  }

  if (file.size > 20 * 1024 * 1024) {
    return { 
      valid: false, 
      error: 'File size exceeds 20MB limit' 
    };
  }

  return { valid: true, mimeType: file.type };
}

/**
 * Analyze image with vision model
 * @param {File|Blob} imageFile - Image file
 * @param {string} userMessage - User's question/instruction
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<string>} - Analysis response
 */
export async function analyzeImage(imageFile, userMessage = '', conversationHistory = []) {
  try {
    console.log('[IMAGE_ANALYSIS] Starting image analysis...');

    // Validate image
    const validation = validateImageFile(imageFile);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Convert to FULL data URL (data:image/png;base64,...)
    console.log('[IMAGE_ANALYSIS] Converting image to base64...');
    const dataUrlImage = await fileToBase64(imageFile);
    const mediaType = validation.mimeType;

    // Prepare the message
    const finalMessage = userMessage || 'Please analyze this image and provide a detailed description.';

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📸 MULTIMODAL VISION REQUEST');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[IMAGE_ANALYSIS] Message:', finalMessage);
    console.log('[IMAGE_ANALYSIS] Image type:', mediaType);
    console.log('[IMAGE_ANALYSIS] Image size:', (dataUrlImage.length / 1024).toFixed(2), 'KB');
    console.log('[IMAGE_ANALYSIS] Data URL format:', dataUrlImage.substring(0, 50) + '...');
    console.log('[IMAGE_ANALYSIS] Data URL valid:', dataUrlImage.startsWith('data:image/'));

    // Call OpenRouter with vision capabilities
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const model = import.meta.env.VITE_OPENROUTER_MODEL || 'gpt-4o-mini';
    console.log('[IMAGE_ANALYSIS] Using model:', model);

    // Build messages with vision payload (OpenRouter format)
    const messages = [];

    // Add conversation history if available
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push(msg);
        }
      });
    }

    // Add current user message with image in proper OpenRouter format
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

    console.log('[IMAGE_ANALYSIS] ✅ Multimodal payload ready');
    console.log('[IMAGE_ANALYSIS] Message content array length:', userMessagePayload.content.length);
    console.log('[IMAGE_ANALYSIS] Has text:', userMessagePayload.content.some(c => c.type === 'text'));
    console.log('[IMAGE_ANALYSIS] Has image_url:', userMessagePayload.content.some(c => c.type === 'image_url'));

    // System prompt for multimodal AI
    const systemPrompt = `You are a multimodal AI assistant with advanced image understanding capabilities.
You can accurately analyze photographs, screenshots, diagrams, charts, documents, memes, artwork, handwriting, and any other visual content.
You provide detailed, accurate, and helpful descriptions and analysis of images.
Always provide complete responses to image analysis requests.`;

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
    console.log('[IMAGE_ANALYSIS] System prompt includes multimodal:', systemPrompt.includes('multimodal'));

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
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
    console.log('[IMAGE_ANALYSIS] Full OpenRouter response:', JSON.stringify(data, null, 2));
    
    const analysisResult = data.choices?.[0]?.message?.content;

    if (!analysisResult) {
      console.error('[IMAGE_ANALYSIS] ❌ No content in response:', data);
      throw new Error('No response from vision model');
    }

    // Verify response is not a fake limitation message
    const fakeLimitationPhrases = [
      'cannot view images',
      'cannot analyze images',
      'cannot see the image',
      'i cannot view',
      'i cannot analyze',
      'unable to view',
      'unable to analyze',
      'no image provided',
      'no image attached'
    ];

    const lowerResponse = analysisResult.toLowerCase();
    if (fakeLimitationPhrases.some(phrase => lowerResponse.includes(phrase))) {
      console.warn('[IMAGE_ANALYSIS] ⚠️ Detected fake limitation message in response');
      console.warn('[IMAGE_ANALYSIS] Response was:', analysisResult);
      throw new Error('Vision model returned limitation message. The model may not support multimodal requests.');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('[IMAGE_ANALYSIS] ✅ Analysis complete');
    console.log('[IMAGE_ANALYSIS] Response preview:', analysisResult.substring(0, 100) + '...');
    console.log('═══════════════════════════════════════════════════════════');
    
    return analysisResult;
  } catch (error) {
    console.error('[IMAGE_ANALYSIS] ❌ Error:', error);
    console.error('[IMAGE_ANALYSIS] Error message:', error.message);
    console.error('[IMAGE_ANALYSIS] Full error:', error);
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
