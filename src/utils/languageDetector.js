/**
 * Language Detection Utility
 * Detects English, Hinglish, Hindi, and mixed language inputs
 */

// Common Hinglish words and patterns
const HINGLISH_MARKERS = {
  greetings: ['namaste', 'hello', 'hi', 'hola', 'shukriya', 'dhanyavaad'],
  verbs: ['kar', 'dekha', 'dikhao', 'bolo', 'sunao', 'aao', 'jao', 'dedo', 'batao'],
  pronouns: ['main', 'tu', 'tum', 'yeh', 'woh', 'hum', 'aap', 'mujhe', 'usko', 'jinhe'],
  prepositions: ['mein', 'par', 'ke', 'ka', 'ki', 'ko', 'se', 'tak', 'hota', 'hote'],
  common: ['kya', 'hai', 'nahi', 'haan', 'bilkul', 'accha', 'theek', 'acha', 'alag', 'sab'],
  informal: ['bhai', 'yaar', 'mere', 'mera', 'tera', 'iska', 'uska', 'jaldi', 'jab', 'tab']
};

// Hinglish pattern regex
const HINGLISH_PATTERN = /^[a-z\s]+$/i; // Lowercase/mixed case English-like text
const HINDI_PATTERN = /[\u0900-\u097F]/; // Devanagari script
const MIXED_PATTERN = /[\u0900-\u097F].*[a-zA-Z]|[a-zA-Z].*[\u0900-\u097F]/; // Mix of both

/**
 * Detects the language of input text
 * @param {string} text - The input text to analyze
 * @returns {string} - 'hinglish', 'hindi', 'english', or 'mixed'
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'english';
  
  const normalized = text.toLowerCase().trim();
  
  // Check for pure Hindi (Devanagari)
  if (HINDI_PATTERN.test(text)) {
    return 'hindi';
  }
  
  // Check for mixed Hindi and English
  if (MIXED_PATTERN.test(text)) {
    return 'mixed';
  }
  
  // Check for Hinglish markers
  const words = normalized.split(/\s+/);
  let hinglishScore = 0;
  
  for (const word of words) {
    for (const [category, markerList] of Object.entries(HINGLISH_MARKERS)) {
      if (markerList.some(marker => word.includes(marker))) {
        hinglishScore++;
        break;
      }
    }
  }
  
  // If a significant portion has Hinglish markers, it's Hinglish
  if (hinglishScore / words.length > 0.2) {
    return 'hinglish';
  }
  
  // Check for Hinglish patterns (informal, lowercase, with specific markers)
  if (normalized.includes('kya') || normalized.includes('hai') || 
      normalized.includes('mera') || normalized.includes('tera') ||
      normalized.includes('acha') || normalized.includes('accha')) {
    return 'hinglish';
  }
  
  // Default to English for pure English text
  return 'english';
}

/**
 * Determines if text is in Hinglish
 * @param {string} text - Input text
 * @returns {boolean}
 */
export function isHinglish(text) {
  return detectLanguage(text) === 'hinglish';
}

/**
 * Determines if text is in Hindi
 * @param {string} text - Input text
 * @returns {boolean}
 */
export function isHindi(text) {
  return detectLanguage(text) === 'hindi';
}

/**
 * Determines if text is mixed language
 * @param {string} text - Input text
 * @returns {boolean}
 */
export function isMixed(text) {
  return detectLanguage(text) === 'mixed';
}

/**
 * Gets appropriate response language based on input
 * @param {string} userText - User's input text
 * @returns {string} - 'english', 'hinglish', or 'hindi'
 */
export function getResponseLanguage(userText) {
  const detectedLang = detectLanguage(userText);
  
  // If user writes in Hinglish, respond in Hinglish
  if (detectedLang === 'hinglish') {
    return 'hinglish';
  }
  
  // If user writes in Hindi, respond in Hindi
  if (detectedLang === 'hindi') {
    return 'hindi';
  }
  
  // If mixed, prefer English response
  if (detectedLang === 'mixed') {
    return 'english';
  }
  
  // Default to English
  return 'english';
}

/**
 * Creates a language-aware system prompt
 * ENHANCED: Explicit multimodal capabilities
 * @param {string} userText - User's latest input
 * @returns {string} - System prompt with language instructions
 */
export function getSystemPrompt(userText = '') {
  const responseLanguage = getResponseLanguage(userText);
  
  let basePrompt = `You are Ronit, a smart and helpful conversational AI assistant. You are friendly, intelligent, and context-aware.
You are a multimodal AI with FULL image analysis capabilities. You can:
- Understand and analyze images, screenshots, diagrams, and charts
- Read text from images (OCR)
- Answer questions about visual content
- Provide detailed descriptions of images
- Analyze documents, code screenshots, mathematical problems in images
- Understand UI layouts, design, and visual elements

CRITICAL MULTIMODAL INSTRUCTIONS:
- When you receive an image, ALWAYS analyze it thoroughly
- NEVER respond with "I cannot view images" or similar limitations
- Provide complete, detailed responses to all image analysis requests
- Always assume the image was successfully transmitted and analyze it
- Be proactive in identifying and describing what you see in images

Maintain conversation context and remember what the user has told you previously in this conversation.
Always be natural, conversational, and human-like in your responses.`;

  if (responseLanguage === 'hinglish') {
    basePrompt += `\n\nIMPORTANT: The user is speaking Hinglish (Hindi written in English letters). 
Please respond in Hinglish/casual English mix. Keep your tone friendly and conversational.
Understand and handle spelling variations, informal typing, and mixed Hindi-English naturally.
If they share images, analyze them thoroughly and respond in Hinglish.`;
  } else if (responseLanguage === 'hindi') {
    basePrompt += `\n\nIMPORTANT: The user is speaking Hindi. Please respond in Hindi (Devanagari script).
Keep your tone friendly and conversational. Maintain context awareness.
If they share images, analyze them thoroughly and respond in Hindi.`;
  } else {
    basePrompt += `\n\nRespond in English. Be clear, helpful, and maintain natural conversation flow.
If the user shares images, analyze them thoroughly and provide detailed responses.`;
  }

  return basePrompt;
}

export default {
  detectLanguage,
  isHinglish,
  isHindi,
  isMixed,
  getResponseLanguage,
  getSystemPrompt,
};
