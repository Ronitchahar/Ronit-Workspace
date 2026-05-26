/**
 * Stable Storage Service for Electron + React
 * electron-store when window.require exists; localStorage in browser
 * Image blobs live in IndexedDB — only lightweight metadata here
 */

import {
  migrateDataUrlToIndexedDB,
  initializeImageStorage,
} from './imageStorageService';

let store = null;
let isElectron = false;

const DATA_URL_PATTERN = /^data:image\//i;
const LARGE_STRING_THRESHOLD = 1000;
const FORBIDDEN_KEYS = new Set([
  'image',
  'base64',
  'blob',
  'imageData',
  'imageBase64',
]);

function isPublicImageUrl(value) {
  return (
    typeof value === 'string' &&
    (value.startsWith('https://') || value.startsWith('http://'))
  );
}

function isDataUrl(value) {
  return typeof value === 'string' && DATA_URL_PATTERN.test(value);
}

function isLargeString(value) {
  return typeof value === 'string' && value.length > LARGE_STRING_THRESHOLD;
}

function containsBinaryPayload(value) {
  if (value == null) return false;
  if (typeof Blob !== 'undefined' && value instanceof Blob) return true;
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return true;
  if (typeof value === 'string') {
    return isDataUrl(value) || (isLargeString(value) && /^[A-Za-z0-9+/=\s]{500,}/.test(value));
  }
  return false;
}

/**
 * Recursively strip binary/base64 fields before any persistence write
 */
export function stripBinaryPayloads(value, depth = 0) {
  if (depth > 25) return value;
  if (containsBinaryPayload(value)) return undefined;

  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stripBinaryPayloads(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  const result = {};
  for (const [key, val] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (key === 'imageUrl' && !isPublicImageUrl(val)) continue;
    if (key === 'imagePath' && (isDataUrl(val) || containsBinaryPayload(val))) continue;
    if (containsBinaryPayload(val)) continue;

    const cleaned = stripBinaryPayloads(val, depth + 1);
    if (cleaned !== undefined) {
      result[key] = cleaned;
    }
  }
  return result;
}

function canUseElectronStore() {
  return typeof window !== 'undefined' && typeof window.require === 'function';
}

function loadElectronStoreClass() {
  if (!canUseElectronStore()) return null;
  try {
    return window.require('electron-store');
  } catch {
    return null;
  }
}

/**
 * Initialize the storage system
 * Call this once on app startup
 */
export async function initializeStorage() {
  try {
    const Store = loadElectronStoreClass();
    if (Store) {
      store = new Store({
        name: 'ronit-workspace-config',
        defaults: {
          chats: [],
          settings: {},
          lastSync: null,
        },
      });
      isElectron = true;
      console.log('✅ Electron Store initialized successfully');
      await initializeImageStorage();
      await cleanupLegacyBase64FromStorage();
      return true;
    }

    console.log('✅ Using localStorage fallback');
    initializeLocalStorage();
    await initializeImageStorage();
    await cleanupLegacyBase64FromStorage();
    return true;
  } catch (error) {
    console.error('❌ Storage initialization error:', error);
    console.error('Error details:', error.message);
    try {
      initializeLocalStorage();
      await initializeImageStorage();
      await cleanupLegacyBase64FromStorage();
      console.log('✅ Switched to localStorage fallback');
      return false;
    } catch (fallbackError) {
      console.error('❌ Even localStorage fallback failed:', fallbackError);
      return false;
    }
  }
}

/**
 * Initialize localStorage as fallback
 */
function initializeLocalStorage() {
  try {
    const existing = localStorage.getItem('ronit-workspace-data');
    if (!existing) {
      const defaults = {
        chats: [],
        settings: {},
        lastSync: null,
      };
      localStorage.setItem('ronit-workspace-data', JSON.stringify(defaults));
      console.log('✅ localStorage initialized with defaults');
    }
  } catch (error) {
    console.error('❌ localStorage initialization error:', error);
    throw error;
  }
}

/**
 * Get storage data safely
 */
function getStorageData() {
  try {
    if (store) {
      return store.store;
    }
    const data = localStorage.getItem('ronit-workspace-data');
    return data ? JSON.parse(data) : { chats: [], settings: {}, lastSync: null };
  } catch (error) {
    console.error('Error reading storage:', error);
    return { chats: [], settings: {}, lastSync: null };
  }
}

/**
 * Set storage data safely
 */
function setStorageData(data) {
  try {
    const sanitized = stripBinaryPayloads(data);
    if (!sanitized) {
      console.error('❌ Refusing to save: binary/base64 payload detected');
      return false;
    }

    if (store) {
      store.store = sanitized;
    } else {
      localStorage.setItem('ronit-workspace-data', JSON.stringify(sanitized));
    }
    return true;
  } catch (error) {
    console.error('Error writing to storage:', error);
    return false;
  }
}

/**
 * Strip base64 blobs from a message; migrate to IndexedDB when possible
 */
async function sanitizeImageMessage(message) {
  if (!message || message.type !== 'image') {
    return message;
  }

  const prompt = message.prompt || message.content || '';
  let imageId = message.imageId;

  const legacyRef = message.imagePath || message.imageUrl || message.image;
  if (!imageId && legacyRef) {
    if (isDataUrl(legacyRef)) {
      imageId = await migrateDataUrlToIndexedDB(legacyRef, prompt);
    } else if (!isLargeString(legacyRef)) {
      imageId = legacyRef;
    }
  }

  const createdAt = message.createdAt || message.timestamp || Date.now();

  const imageUrl = isPublicImageUrl(message.imageUrl) ? message.imageUrl : null;

  return {
    id: message.id,
    sender: message.sender,
    type: 'image',
    imageId: imageId || null,
    imageUrl,
    storagePath: message.storagePath || null,
    prompt,
    createdAt,
    timestamp: message.timestamp || createdAt,
  };
}

/**
 * Remove embedded base64 from localStorage chat data
 */
export async function cleanupLegacyBase64FromStorage() {
  try {
    const data = getStorageData();
    let changed = false;

    if (data.imageHistory?.length) {
      const cleanedHistory = [];
      for (const entry of data.imageHistory) {
        if (isDataUrl(entry.url)) {
          const imageId = await migrateDataUrlToIndexedDB(entry.url, entry.prompt);
          if (imageId) {
            cleanedHistory.push({
              id: entry.id || imageId,
              imageId,
              prompt: entry.prompt,
              timestamp: entry.timestamp || Date.now(),
              sessionId: entry.sessionId,
            });
            changed = true;
          }
        } else if (entry.imageId || (entry.url && !isDataUrl(entry.url))) {
          cleanedHistory.push({
            id: entry.id,
            imageId: entry.imageId || entry.url,
            prompt: entry.prompt,
            timestamp: entry.timestamp,
            sessionId: entry.sessionId,
          });
        }
      }
      if (changed) {
        data.imageHistory = cleanedHistory;
      }
    }

    for (const chat of data.chats || []) {
      if (!chat.messages) continue;

      const sanitizedMessages = [];
      for (const message of chat.messages) {
        if (message.type === 'image' || message.imagePath || message.imageUrl || message.image) {
          const cleaned = await sanitizeImageMessage(message);
          if (
            cleaned.imageId !== message.imageId ||
            message.image ||
            message.imageUrl ||
            isDataUrl(message.imagePath) ||
            isDataUrl(message.content)
          ) {
            changed = true;
          }
          sanitizedMessages.push(cleaned);
        } else if (isDataUrl(message.content) || isLargeString(message.content)) {
          changed = true;
          sanitizedMessages.push({
            ...message,
            content: message.prompt || '[Image]',
          });
        } else {
          sanitizedMessages.push(message);
        }
      }
      chat.messages = sanitizedMessages;
    }

    if (changed) {
      setStorageData(data);
      console.log('✅ Cleaned legacy base64 data from localStorage');
    }

    return changed;
  } catch (error) {
    console.warn('Legacy base64 cleanup skipped:', error.message);
    return false;
  }
}

/**
 * Save a chat message (TEXT + IMAGE METADATA, NO LARGE BLOBS)
 * Images are saved to filesystem with metadata stored in chat history
 * @param {string} sessionId - Chat session ID
 * @param {string} sender - 'user' or 'assistant'
 * @param {string} content - Message content
 * @param {object} metadata - Additional data (imagePath, prompt for images)
 * @returns {Promise<object>} - Saved message with ID and timestamp
 */
export async function saveChatMessage(sessionId, sender, content, metadata = {}) {
  try {
    const data = getStorageData();

    // Find or create chat session
    let chat = data.chats.find(c => c.id === sessionId);
    if (!chat) {
      chat = {
        id: sessionId,
        title: 'Chat Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      data.chats.push(chat);
    }

    let messageType = 'text';
    let messageData = { content };

    const imageRef = metadata.imageId || metadata.imagePath;
    const cloudUrl = isPublicImageUrl(metadata.imageUrl) ? metadata.imageUrl : null;

    if (metadata.type === 'image' && (cloudUrl || (imageRef && !isDataUrl(imageRef)))) {
      messageType = 'image';
      const createdAt = metadata.createdAt || Date.now();
      messageData = {
        imageId: metadata.imageId || (imageRef?.startsWith('img-') ? imageRef : null),
        imageUrl: cloudUrl,
        storagePath: metadata.storagePath || null,
        prompt: metadata.prompt || content,
        createdAt,
      };
    } else if (metadata.type === 'image' && isDataUrl(imageRef)) {
      throw new Error('Refusing to store base64 image in localStorage. Save to IndexedDB first.');
    }

    const message = stripBinaryPayloads({
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender,
      type: messageType,
      ...messageData,
      timestamp: Date.now(),
    });

    if (!message) {
      throw new Error('Refusing to save message: binary/base64 payload detected');
    }

    chat.messages.push(message);
    chat.updatedAt = Date.now();

    // Check storage size - should be much smaller now (text only)
    const storageSize = JSON.stringify(data).length;
    const sizeInMB = (storageSize / 1024 / 1024).toFixed(2);
    
    if (storageSize > 50 * 1024 * 1024) {
      console.warn(`⚠️ Storage size is large (${sizeInMB}MB). Consider clearing old chats.`);
    }

    // Save to storage
    const success = setStorageData(data);

    if (success) {
      const msgType = messageType === 'image' ? 'image' : 'text';
      console.log(`✅ Saved ${msgType} message to ${isElectron ? 'Electron Store' : 'localStorage'} (${sizeInMB}MB total)`);
      return message;
    }
    throw new Error('Failed to write to storage');
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('❌ Storage quota exceeded - consider clearing chat history');
      throw new Error('Storage quota exceeded. Please clear some old chats.');
    }
    console.error('Error saving message:', error);
    throw error;
  }
}

/**
 * Load chat history for a session
 * @param {string} sessionId - Chat session ID
 * @returns {Promise<Array>} - Array of messages
 */
export async function loadChatHistory(sessionId) {
  try {
    console.log(`📝 Loading chat history for session: ${sessionId}`);
    const data = getStorageData();

    const chat = data.chats?.find(c => c.id === sessionId);
    if (!chat) {
      console.warn(`⚠️ Session not found: ${sessionId}`);
      return [];
    }

    const messages = chat.messages || [];
    console.log(`✅ Loaded ${messages.length} messages from session ${sessionId}`);
    return messages;
  } catch (error) {
    console.error(`❌ Error loading chat history for ${sessionId}:`, error);
    console.error('Error details:', error.message);
    return [];
  }
}


/**
 * Load all chat sessions
 * @returns {Promise<Array>} - Array of chat sessions (without full message history)
 */
export async function loadChatSessions() {
  try {
    console.log('📂 Loading chat sessions from storage...');
    const data = getStorageData();

    if (data.chats && Array.isArray(data.chats)) {
      // Return sessions without full message history (for listing)
      const sessions = data.chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chat.messages ? chat.messages.length : 0,
      }));

      console.log(`✅ Loaded ${sessions.length} chat sessions from storage`);
      return sessions;
    }

    console.log('✅ No chat sessions found (fresh start)');
    return [];
  } catch (error) {
    console.error('❌ Error loading chat sessions:', error);
    console.error('Error details:', error.message);
    return [];
  }
}

/**
 * Save or update a chat session
 * @param {string} sessionId - Chat session ID
 * @param {string} title - Chat title
 * @returns {Promise<object>} - Updated session
 */
export async function saveChatSession(sessionId, title) {
  try {
    const data = getStorageData();

    let chat = data.chats.find(c => c.id === sessionId);
    if (!chat) {
      chat = {
        id: sessionId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      data.chats.push(chat);
    } else {
      chat.title = title;
      chat.updatedAt = Date.now();
    }

    setStorageData(data);

    return {
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length,
    };
  } catch (error) {
    console.error('Error saving chat session:', error);
    throw error;
  }
}

/**
 * Clear entire chat history for a session
 * @param {string} sessionId - Chat session ID
 * @returns {Promise<boolean>}
 */
export async function clearChatHistory(sessionId) {
  try {
    const data = getStorageData();
    const chatIndex = data.chats.findIndex(c => c.id === sessionId);

    if (chatIndex !== -1) {
      data.chats[chatIndex].messages = [];
      data.chats[chatIndex].updatedAt = Date.now();
      setStorageData(data);
      console.log(`✓ Cleared chat history for session ${sessionId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    throw error;
  }
}

/**
 * Delete entire chat session
 * @param {string} sessionId - Chat session ID
 * @returns {Promise<boolean>}
 */
export async function deleteChatSession(sessionId) {
  try {
    const data = getStorageData();
    const originalLength = data.chats.length;

    data.chats = data.chats.filter(c => c.id !== sessionId);

    if (data.chats.length < originalLength) {
      setStorageData(data);
      console.log(`✓ Deleted chat session ${sessionId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
}

/**
 * Delete a single message from a chat
 * @param {string} sessionId - Chat session ID
 * @param {string} messageId - Message ID to delete
 * @returns {Promise<boolean>}
 */
export async function deleteChatMessage(sessionId, messageId, imageId = null) {
  try {
    const data = getStorageData();
    const chat = data.chats.find(c => c.id === sessionId);

    if (chat && chat.messages) {
      const originalLength = chat.messages.length;
      chat.messages = chat.messages.filter(
        (m) => m.id !== messageId && (!imageId || m.imageId !== imageId)
      );

      if (chat.messages.length < originalLength) {
        chat.updatedAt = Date.now();
        setStorageData(data);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

/**
 * Search messages across all chats
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Array of matching messages with session info
 */
export async function searchMessages(query) {
  try {
    const data = getStorageData();
    const results = [];

    for (const chat of data.chats) {
      if (chat.messages) {
        for (const message of chat.messages) {
          if (message.content.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              ...message,
              sessionId: chat.id,
              sessionTitle: chat.title,
            });
          }
        }
      }
    }

    return results;
  } catch (error) {
    console.error('Error searching messages:', error);
    return [];
  }
}

/**
 * Get image history
 * @returns {Promise<Array>} - Array of generated images
 */
export async function getImageHistory() {
  try {
    const data = getStorageData();
    return data.imageHistory || [];
  } catch (error) {
    console.error('Error loading image history:', error);
    return [];
  }
}

/**
 * Save generated image
 * @param {string} imageUrl - Image URL
 * @param {string} prompt - Generation prompt
 * @param {string} sessionId - Associated chat session ID
 * @returns {Promise<object>} - Saved image entry
 */
export async function saveGeneratedImage(imageId, prompt, sessionId) {
  try {
    if (!imageId || isDataUrl(imageId)) {
      throw new Error('saveGeneratedImage requires imageId, not base64 data');
    }

    const data = getStorageData();

    if (!data.imageHistory) {
      data.imageHistory = [];
    }

    const imageEntry = {
      id: imageId,
      imageId,
      prompt,
      timestamp: Date.now(),
      sessionId,
    };

    data.imageHistory.push(imageEntry);
    setStorageData(data);

    return imageEntry;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}

/**
 * Get storage statistics
 * @returns {Promise<object>} - Storage info
 */
export async function getStorageStats() {
  try {
    const data = getStorageData();
    let totalMessages = 0;

    for (const chat of data.chats) {
      totalMessages += chat.messages ? chat.messages.length : 0;
    }

    const stats = {
      chatCount: data.chats ? data.chats.length : 0,
      messageCount: totalMessages,
      imageCount: data.imageHistory ? data.imageHistory.length : 0,
      storageType: isElectron ? 'Electron Store' : 'localStorage',
      lastSync: data.lastSync || null,
    };

    console.log('Storage Stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { chatCount: 0, messageCount: 0, imageCount: 0, storageType: 'unknown' };
  }
}

/**
 * Export all data as JSON
 * @returns {Promise<string>} - JSON string of all data
 */
export async function exportAllData() {
  try {
    const data = getStorageData();
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
}

/**
 * Import data from JSON
 * @param {string} jsonData - JSON string to import
 * @returns {Promise<boolean>}
 */
export async function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    setStorageData(data);
    console.log('✓ Data imported successfully');
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}

/**
 * Clear all data
 * @returns {Promise<boolean>}
 */
export async function clearAllData() {
  try {
    const defaults = {
      chats: [],
      settings: {},
      imageHistory: [],
      lastSync: null,
    };
    setStorageData(defaults);
    console.log('✓ All data cleared');
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}

/**
 * Check if running in Electron
 * @returns {boolean}
 */
export function isRunningInElectron() {
  return isElectron && store !== null;
}

/**
 * Get a value from stable storage (Electron Store or localStorage)
 * Used for device-related data like deviceId, device info, etc.
 * @param {string} key - Storage key
 * @returns {any} - Stored value or null
 */
export function stableStorageGet(key) {
  try {
    if (store) {
      // Electron Store - store values at top level with prefix
      const prefixedKey = `_device_${key}`;
      return store.get(prefixedKey);
    } else {
      // localStorage fallback
      const data = getStorageData();
      return data[`_device_${key}`];
    }
  } catch (error) {
    console.warn(`Error getting stable storage key "${key}":`, error);
    return null;
  }
}

/**
 * Set a value in stable storage (Electron Store or localStorage)
 * Used for device-related data like deviceId, device info, etc.
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @returns {boolean} - Success
 */
export function stableStorageSet(key, value) {
  try {
    const prefixedKey = `_device_${key}`;
    
    if (store) {
      // Electron Store
      store.set(prefixedKey, value);
      return true;
    } else {
      // localStorage fallback
      const data = getStorageData();
      data[prefixedKey] = value;
      return setStorageData(data);
    }
  } catch (error) {
    console.warn(`Error setting stable storage key "${key}":`, error);
    return false;
  }
}

/**
 * Remove a value from stable storage
 * @param {string} key - Storage key
 * @returns {boolean} - Success
 */
export function stableStorageRemove(key) {
  try {
    const prefixedKey = `_device_${key}`;
    
    if (store) {
      // Electron Store
      store.delete(prefixedKey);
      return true;
    } else {
      // localStorage fallback
      const data = getStorageData();
      delete data[prefixedKey];
      return setStorageData(data);
    }
  } catch (error) {
    console.warn(`Error removing stable storage key "${key}":`, error);
    return false;
  }
}

export default {
  initializeStorage,
  saveChatMessage,
  loadChatHistory,
  loadChatSessions,
  saveChatSession,
  clearChatHistory,
  deleteChatSession,
  deleteChatMessage,
  searchMessages,
  getImageHistory,
  saveGeneratedImage,
  getStorageStats,
  exportAllData,
  importData,
  clearAllData,
  cleanupLegacyBase64FromStorage,
  stripBinaryPayloads,
  isRunningInElectron,
  stableStorageGet,
  stableStorageSet,
  stableStorageRemove,
};
