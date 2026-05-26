import { detectLanguage, getResponseLanguage, getSystemPrompt } from "../utils/languageDetector";
import { preprocessUserInput } from "../utils/hinglishProcessor";
import { optimizeConversationHistory } from "../utils/tokenCounter";

/**
 * Enhanced AI Response with Conversation History
 * Maintains full conversation context and supports Hinglish
 * @param {string} message - User message
 * @param {Array} conversationHistory - Previous messages in format { role, content }
 * @param {object} fileData - Optional file data (image, pdf, text)
 * @returns {Promise<string>} - AI response text
 */
export async function getAIResponse(message, conversationHistory = [], fileData = null) {
  if ((!message || typeof message !== "string") && !fileData) {
    throw new Error("Invalid message or file provided to AI service.");
  }

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OpenRouter API key. Set VITE_OPENROUTER_API_KEY in your environment.");
  }

  const model = import.meta.env.VITE_OPENROUTER_MODEL || "gpt-4o-mini";
  
  // Detect language and preprocess user input
  const detectedLanguage = detectLanguage(message);
  const processedMessage = preprocessUserInput(message);
  const responseLanguage = getResponseLanguage(message);
  const systemPrompt = getSystemPrompt(message);

  // Build messages array with conversation history
  let finalMessages = [];
  
  // Add conversation history (optimized for token count)
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    // Optimize history to fit within context window
    const optimized = optimizeConversationHistory(conversationHistory, 4096, 1000);
    finalMessages = [...optimized];
  }

  // Add current user message
  if (fileData && fileData.type === "image") {
    // Vision model payload
    finalMessages.push({
      role: "user",
      content: [
        { type: "text", text: processedMessage || "Please describe this image." },
        { type: "image_url", image_url: { url: fileData.content } }
      ]
    });
  } else if (fileData && (fileData.type === "text" || fileData.type === "pdf")) {
    // Text based document context
    const fullText = `Here is the document context from an attached file (${fileData.file.name}):\n\n${fileData.content}\n\n---\nUser Question: ${processedMessage || "Please summarize this document."}`;
    finalMessages.push({
      role: "user",
      content: fullText,
    });
  } else {
    // Normal text message
    finalMessages.push({
      role: "user",
      content: processedMessage,
    });
  }

  // Build request with system prompt and language instructions
  const requestBody = {
    model,
    messages: finalMessages,
    system: systemPrompt,
  };

  try {
    // Validate API key
    if (!apiKey || apiKey === 'undefined' || apiKey.trim().length === 0) {
      console.error('❌ API Key Error: VITE_OPENROUTER_API_KEY not configured');
      throw new Error('API key not configured. Please set VITE_OPENROUTER_API_KEY environment variable.');
    }

    console.log('📤 Sending request to OpenRouter...');
    console.log('Model:', model);
    console.log('Messages count:', finalMessages.length);
    console.log('System prompt length:', systemPrompt.length);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response received. Status:', response.status);
    const data = await response.json();
    console.log("OpenRouter response:", data);
    console.log("Detected language:", detectedLanguage, "Response language:", responseLanguage);

    if (!response.ok) {
      const errorMessage = data.error?.message || data?.message || response.statusText || "AI service request failed.";
      console.error('❌ API Error:', errorMessage, '(Status:', response.status + ')');
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    const aiResponse = (
      data?.choices?.[0]?.message?.content ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I could not parse the AI reply."
    );

    console.log('✅ AI Response received:', aiResponse.substring(0, 100) + '...');
    return aiResponse;
  } catch (error) {
    console.error("❌ AI fetch error:", error);
    console.error("Error type:", error.constructor.name);
    
    if (error.message && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to reach AI service. Check your internet connection.');
    }
    
    throw new Error(error.message || "Something went wrong while contacting the AI service.");
  }
};

/**
 * Get AI response with streaming support (returns promise)
 * @param {string} message - User message
 * @param {Array} conversationHistory - Conversation history
 * @param {object} fileData - Optional file data
 * @returns {Promise<string>} - AI response
 */
export async function getAIResponseStreaming(message, conversationHistory = [], fileData = null) {
  // For now, this is the same as getAIResponse
  // Can be enhanced later to support streaming responses
  return getAIResponse(message, conversationHistory, fileData);
}

/**
 * Get contextual AI response that understands conversation context
 * Automatically builds message history from recent messages
 * @param {string} message - Current user message
 * @param {Array} recentMessages - Recent messages from chat (in chronological order)
 * @param {object} fileData - Optional file data
 * @returns {Promise<string>} - AI response
 */
export async function getContextualAIResponse(message, recentMessages = [], fileData = null) {
  // Convert chat messages to API format
  const conversationHistory = recentMessages
    .filter(msg => msg && msg.sender && msg.text) // Validate messages
    .map(msg => ({
      role: msg.sender === "ai" ? "assistant" : "user",
      content: msg.text,
    }));

  return getAIResponse(message, conversationHistory, fileData);
}

/**
 * Generate a chat title based on the first message
 * Enhanced to understand Hinglish
 * @param {string} firstMessage - First user message
 * @returns {Promise<string>} - Generated title
 */
export async function generateChatTitle(firstMessage) {
  if (!firstMessage || typeof firstMessage !== "string") return "New Chat";

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) return "New Chat";

  const model = import.meta.env.VITE_OPENROUTER_MODEL || "gpt-4o-mini";
  const processedMessage = preprocessUserInput(firstMessage);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates short, concise chat titles. Always respond with exactly the title, nothing else.",
          },
          {
            role: "user",
            content: `Generate a short, concise, and descriptive title (max 4 words) for a chat starting with: "${processedMessage}". Only return the title, no quotes or extra text.`,
          },
        ],
      }),
    });

    if (!response.ok) return "New Chat";

    const data = await response.json();
    let title = data?.choices?.[0]?.message?.content ||
                data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                "New Chat";
                
    title = title.replace(/['"]+/g, '').trim();
    return title.length > 30 ? title.substring(0, 30) + "..." : title;
  } catch (error) {
    console.error("AI Title fetch error:", error);
    return "New Chat";
  }
}

/**
 * Detect if user is speaking Hinglish and needs language support
 * @param {string} message - User message
 * @returns {object} - Language info { language, isHinglish, responseLanguage }
 */
export function detectUserLanguage(message) {
  return {
    language: detectLanguage(message),
    isHinglish: detectLanguage(message) === "hinglish",
    responseLanguage: getResponseLanguage(message),
  };
}
