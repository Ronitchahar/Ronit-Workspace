import { detectLanguage, getResponseLanguage, getSystemPrompt } from "../utils/languageDetector";
import { preprocessUserInput } from "../utils/hinglishProcessor";
import { optimizeConversationHistory } from "../utils/tokenCounter";

/**
 * Enhanced AI Response with Conversation History
 * Maintains full conversation context and supports Hinglish
 * CRITICAL: Properly handles multimodal image data
 * @param {string} message - User message
 * @param {Array} conversationHistory - Previous messages in format { role, content }
 * @param {object} fileData - Optional file data { type: 'image'|'pdf'|'text', content: base64|text }
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
  const detectedLanguage = fileData?.type === 'image' ? 'multimodal' : detectLanguage(message || '');
  const processedMessage = preprocessUserInput(message || '');
  const responseLanguage = getResponseLanguage(message || '');
  const systemPrompt = getSystemPrompt(message || '');

  // Build messages array with conversation history
  let finalMessages = [];
  
  // Add conversation history (optimized for token count)
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    // Optimize history to fit within context window
    const optimized = optimizeConversationHistory(conversationHistory, 4096, 1000);
    finalMessages = [...optimized];
  }

  // Add current user message with proper multimodal support
  if (fileData && fileData.type === "image") {
    // CRITICAL: Validate image data before constructing message
    if (!fileData.content) {
      console.error('❌ [OPENAI] Image fileData provided but no content (base64 data URL)');
      throw new Error('Image data missing - cannot send to AI model');
    }
    
    if (!fileData.content.startsWith('data:image/')) {
      console.error('❌ [OPENAI] Image content is not a valid data URL');
      console.error('[OPENAI] Content starts with:', fileData.content.substring(0, 50));
      throw new Error('Image data is not in valid data URL format');
    }

    console.log('[OPENAI] 📸 Multimodal message with image');
    console.log('[OPENAI] Image data URL length:', fileData.content.length);
    console.log('[OPENAI] Image format valid: YES');
    
    // Vision model payload with proper multimodal structure
    const userMessageContent = [];
    
    // Add text part
    if (processedMessage && processedMessage.trim().length > 0) {
      userMessageContent.push({
        type: "text",
        text: processedMessage
      });
    } else {
      // If no user message, provide default instruction
      userMessageContent.push({
        type: "text",
        text: "Please describe this image and provide detailed analysis."
      });
    }
    
    // Add image part
    userMessageContent.push({
      type: "image_url",
      image_url: {
        url: fileData.content  // Full data URL: data:image/png;base64,...
      }
    });
    
    finalMessages.push({
      role: "user",
      content: userMessageContent
    });
    
    console.log('[OPENAI] ✅ Multimodal message constructed with', userMessageContent.length, 'parts');
    console.log('[OPENAI] Has text:', userMessageContent.some(p => p.type === 'text'));
    console.log('[OPENAI] Has image_url:', userMessageContent.some(p => p.type === 'image_url'));
    
  } else if (fileData && (fileData.type === "text" || fileData.type === "pdf")) {
    // Text based document context
    console.log('[OPENAI] 📄 Document analysis mode -', fileData.type?.toUpperCase());
    
    const fullText = `Here is the document context from an attached file (${fileData.file?.name || 'document'}):\n\n${fileData.content}\n\n---\nUser Question: ${processedMessage || "Please summarize this document."}`;
    finalMessages.push({
      role: "user",
      content: fullText,
    });
    
    console.log('[OPENAI] Document content included, length:', fullText.length);
    
  } else {
    // Normal text message (no file)
    console.log('[OPENAI] 💬 Text message');
    console.log('[OPENAI] Message length:', processedMessage.length);
    
    finalMessages.push({
      role: "user",
      content: processedMessage || "Hello"
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

    console.log('📤 [OPENAI] Sending request to OpenRouter...');
    console.log('[OPENAI] Model:', model);
    console.log('[OPENAI] Messages count:', finalMessages.length);
    console.log('[OPENAI] Multimodal request:', fileData?.type === 'image' ? 'YES' : 'NO');
    console.log('[OPENAI] System prompt includes vision:', systemPrompt.includes('image') || systemPrompt.includes('visual') ? 'YES' : 'NO');

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": typeof window !== 'undefined' ? window.location.href : '',
        "X-Title": "Ronit AI Assistant"
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 [OPENAI] Response received. Status:', response.status);
    
    const data = await response.json();
    console.log('[OPENAI] Response structure:', {
      hasChoices: !!data?.choices,
      choicesLength: data?.choices?.length,
      messageContent: !!data?.choices?.[0]?.message?.content
    });

    if (!response.ok) {
      const errorMessage = data.error?.message || data?.message || response.statusText || "AI service request failed.";
      console.error('❌ [OPENAI] API Error:', errorMessage, '(Status:', response.status + ')');
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    const aiResponse = (
      data?.choices?.[0]?.message?.content ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I could not parse the AI reply."
    );

    // Validate response is not a limitation message
    if (fileData?.type === 'image') {
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

      const lowerResponse = aiResponse.toLowerCase();
      if (fakeLimitationPhrases.some(phrase => lowerResponse.includes(phrase))) {
        console.warn('[OPENAI] ⚠️ Detected fake limitation message in response');
        console.warn('[OPENAI] This indicates the model does not support multimodal requests');
        throw new Error('Vision model returned limitation message. The model may not support image analysis.');
      }
    }

    console.log('✅ [OPENAI] AI Response received successfully');
    console.log('[OPENAI] Response length:', aiResponse.length);
    console.log('[OPENAI] Response preview:', aiResponse.substring(0, 80) + '...');
    return aiResponse;
  } catch (error) {
    console.error("❌ [OPENAI] AI fetch error:", error);
    console.error("[OPENAI] Error type:", error.constructor.name);
    console.error("[OPENAI] Error message:", error.message);
    
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
