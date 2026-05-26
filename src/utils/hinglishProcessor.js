/**
 * Hinglish Processor Utility
 * Handles spelling corrections and normalization for Hinglish text
 */

// Common Hinglish spelling variations and corrections
const HINGLISH_CORRECTIONS = {
  // Common spelling mistakes
  'mhuje': 'mujhe',
  'mjhe': 'mujhe',
  'mjy': 'mujhe',
  'meera': 'mera',
  'meri': 'mera',
  'thra': 'tera',
  'theri': 'teri',
  'uska': 'uska',
  'usska': 'uska',
  'iskaa': 'iska',
  'jska': 'iska',
  'kya': 'kya',
  'kia': 'kya',
  'kya': 'kya',
  'dia': 'diya',
  'diya': 'diya',
  'diya': 'diya',
  'kar': 'kar',
  'karun': 'karun',
  'krdu': 'kar du',
  'likha': 'likha',
  'likhi': 'likhi',
  'batao': 'batao',
  'bata': 'bata',
  'btao': 'batao',
  'dekho': 'dekho',
  'dikha': 'dikha',
  'dikha': 'dikha',
  'sunao': 'sunao',
  'suna': 'suna',
  'aaj': 'aaj',
  'aajkal': 'aaj kal',
  'kal': 'kal',
  'kl': 'kal',
  'jab': 'jab',
  'tab': 'tab',
  'ussi': 'ussi',
  'same': 'same',
  'samaa': 'sama',
  'bilkul': 'bilkul',
  'bilkul': 'bilkul',
  'thik': 'theek',
  'theek': 'theek',
  'acha': 'acha',
  'accha': 'acha',
  'achcha': 'acha',
  'nahi': 'nahi',
  'nahin': 'nahi',
  'haan': 'haan',
  'han': 'haan',
  'yeh': 'yeh',
  'ye': 'yeh',
  'woh': 'woh',
  'wo': 'woh',
  'jaldi': 'jaldi',
  'jaldii': 'jaldi',
  'jrdi': 'jaldi'
};

// Common abbreviations and short forms
const ABBREVIATIONS = {
  'bc': 'bhai', // Can be contextual
  'yr': 'yaar',
  'u': 'you',
  'ur': 'your',
  'pls': 'please',
  'plz': 'please',
  'thx': 'thanks',
  'thnx': 'thanks',
  'ok': 'okay',
  'ok': 'okay',
  'tbh': 'to be honest',
  'fyi': 'for your information',
  'asap': 'as soon as possible',
  'ty': 'thank you',
  'tnx': 'thanks',
};

/**
 * Corrects common Hinglish spelling mistakes
 * @param {string} text - Input Hinglish text
 * @returns {string} - Corrected text
 */
export function correctSpelling(text) {
  if (!text || typeof text !== 'string') return text;
  
  let corrected = text.toLowerCase();
  
  // Apply corrections
  for (const [wrong, correct] of Object.entries(HINGLISH_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    corrected = corrected.replace(regex, correct);
  }
  
  // Expand abbreviations
  for (const [abbr, full] of Object.entries(ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    corrected = corrected.replace(regex, full);
  }
  
  return corrected;
}

/**
 * Normalizes Hinglish text for better understanding
 * Handles mixed spacing, punctuation, and common patterns
 * @param {string} text - Input text
 * @returns {string} - Normalized text
 */
export function normalizeHinglish(text) {
  if (!text || typeof text !== 'string') return text;
  
  let normalized = text.trim();
  
  // Fix multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Fix spacing around punctuation
  normalized = normalized.replace(/\s+([.!?,;:])/g, '$1');
  normalized = normalized.replace(/([.!?,;:])\s*/g, '$1 ');
  
  // Common word boundary fixes for Hinglish
  normalized = normalized.replace(/\s+(meri|mera|tera|uska|iska)\s+/gi, ' $1 ');
  
  return normalized;
}

/**
 * Analyzes Hinglish text for typos and suggests corrections
 * @param {string} text - Input text
 * @returns {object} - { originalText, correctedText, hasTypos }
 */
export function analyzeHinglish(text) {
  const corrected = correctSpelling(text);
  const normalized = normalizeHinglish(corrected);
  
  return {
    originalText: text,
    correctedText: corrected,
    normalizedText: normalized,
    hasTypos: corrected !== text.toLowerCase(),
  };
}

/**
 * Preprocesses user input for better AI understanding
 * Combines spelling correction, normalization, and context
 * @param {string} userInput - User's raw input
 * @returns {string} - Preprocessed input for AI
 */
export function preprocessUserInput(userInput) {
  if (!userInput || typeof userInput !== 'string') return userInput;
  
  // First normalize
  let processed = normalizeHinglish(userInput);
  
  // Then correct spelling
  processed = correctSpelling(processed);
  
  // Preserve original capitalization for proper nouns at sentence starts
  if (userInput[0] === userInput[0].toUpperCase()) {
    processed = processed.charAt(0).toUpperCase() + processed.slice(1);
  }
  
  return processed;
}

/**
 * Creates a context-aware prompt for Hinglish understanding
 * @returns {string} - System instruction for handling Hinglish
 */
export function getHinglishInstructions() {
  return `When responding to Hinglish text:
1. Understand mixed Hindi-English input naturally
2. Handle common spelling variations (e.g., 'mhuje' = 'mujhe', 'dikha' = 'dekha')
3. Interpret informal typing and abbreviations
4. Recognize intent despite typos
5. Maintain conversational tone
6. Match the user's language style in your response`;
}

export default {
  correctSpelling,
  normalizeHinglish,
  analyzeHinglish,
  preprocessUserInput,
  getHinglishInstructions,
};
