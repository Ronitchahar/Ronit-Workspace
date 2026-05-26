/**
 * Token Counter Utility
 * Estimates tokens and manages conversation history size
 * Based on typical token counts (rough estimation: ~4 chars per token)
 */

// Approximate tokens per character (varies by model)
const TOKENS_PER_CHAR = 0.25; // ~4 characters per token
const TOKENS_PER_WORD = 1.3; // Average word length

/**
 * Estimates token count for a text string
 * This is a rough estimate - actual count depends on the tokenizer
 * @param {string} text - Text to count tokens for
 * @returns {number} - Estimated token count
 */
export function estimateTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  
  // Split by whitespace for word count
  const words = text.trim().split(/\s+/).length;
  
  // Use word-based estimation as it's more reliable
  return Math.ceil(words * TOKENS_PER_WORD);
}

/**
 * Estimates tokens for an array of messages
 * @param {Array} messages - Array of message objects with 'content' or 'text' property
 * @returns {number} - Total estimated tokens
 */
export function estimateMessagesTokens(messages) {
  if (!Array.isArray(messages)) return 0;
  
  let totalTokens = 0;
  
  for (const msg of messages) {
    const content = msg.content || msg.text || '';
    totalTokens += estimateTokens(content);
    
    // Add overhead for message formatting (~4 tokens per message for role, etc)
    totalTokens += 4;
  }
  
  return totalTokens;
}

/**
 * Estimates tokens for a complete conversation including system prompt
 * @param {string} systemPrompt - System prompt text
 * @param {Array} messages - Array of message objects
 * @returns {number} - Total estimated tokens
 */
export function estimateConversationTokens(systemPrompt, messages) {
  let totalTokens = estimateTokens(systemPrompt) + 4; // +4 for system message overhead
  totalTokens += estimateMessagesTokens(messages);
  return totalTokens;
}

/**
 * Checks if conversation exceeds token limit
 * @param {number} estimatedTokens - Estimated total tokens
 * @param {number} maxTokens - Maximum allowed tokens (default: 4000)
 * @returns {boolean}
 */
export function exceedsTokenLimit(estimatedTokens, maxTokens = 4000) {
  return estimatedTokens > maxTokens;
}

/**
 * Trims conversation history to fit within token limit
 * Keeps the most recent messages and removes oldest ones
 * Always preserves system context
 * @param {Array} messages - Array of message objects
 * @param {number} maxTokens - Maximum allowed tokens (default: 4000)
 * @returns {Array} - Trimmed message array
 */
export function trimConversationHistory(messages, maxTokens = 4000) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return messages;
  }
  
  // Always keep at least the last 5 messages for context
  const MIN_MESSAGES = 5;
  
  if (messages.length <= MIN_MESSAGES) {
    return messages;
  }
  
  // Start from the end and keep adding messages until we exceed token limit
  const trimmed = [];
  let currentTokens = 0;
  
  // Go through messages in reverse (from newest to oldest)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = estimateTokens(msg.content || msg.text || '') + 4;
    
    if (currentTokens + msgTokens > maxTokens && trimmed.length >= MIN_MESSAGES) {
      // Stop if we'd exceed limit and have minimum messages
      break;
    }
    
    trimmed.unshift(msg);
    currentTokens += msgTokens;
  }
  
  return trimmed;
}

/**
 * Optimizes conversation history for API calls
 * Removes oldest messages while preserving recent context
 * @param {Array} messages - Array of message objects
 * @param {number} contextWindowSize - Model's context window (default: 4096)
 * @param {number} reserveTokens - Tokens reserved for response (default: 1000)
 * @returns {Array} - Optimized message array
 */
export function optimizeConversationHistory(messages, contextWindowSize = 4096, reserveTokens = 1000) {
  if (!Array.isArray(messages)) return [];
  
  const availableTokens = contextWindowSize - reserveTokens;
  const trimmed = trimConversationHistory(messages, availableTokens);
  
  return trimmed;
}

/**
 * Gets conversation summary statistics
 * @param {Array} messages - Array of message objects
 * @returns {object} - Statistics object
 */
export function getConversationStats(messages) {
  if (!Array.isArray(messages)) {
    return { messageCount: 0, estimatedTokens: 0, avgMessageLength: 0 };
  }
  
  const messageCount = messages.length;
  const estimatedTokens = estimateMessagesTokens(messages);
  const totalChars = messages.reduce((sum, msg) => {
    return sum + (msg.content || msg.text || '').length;
  }, 0);
  const avgMessageLength = messageCount > 0 ? totalChars / messageCount : 0;
  
  return {
    messageCount,
    estimatedTokens,
    avgMessageLength: Math.round(avgMessageLength),
    totalCharacters: totalChars,
  };
}

/**
 * Creates a warning if conversation is getting large
 * @param {number} estimatedTokens - Current estimated tokens
 * @param {number} maxTokens - Maximum recommended tokens
 * @returns {string|null} - Warning message or null
 */
export function getConversationSizeWarning(estimatedTokens, maxTokens = 4000) {
  const percentage = (estimatedTokens / maxTokens) * 100;
  
  if (percentage > 90) {
    return 'Conversation is very large. History will be trimmed to optimize performance.';
  } else if (percentage > 75) {
    return 'Conversation is getting large. Consider starting a new chat for better performance.';
  } else if (percentage > 50) {
    return 'Conversation history is building up. Keep track of the token count.';
  }
  
  return null;
}

export default {
  estimateTokens,
  estimateMessagesTokens,
  estimateConversationTokens,
  exceedsTokenLimit,
  trimConversationHistory,
  optimizeConversationHistory,
  getConversationStats,
  getConversationSizeWarning,
};
