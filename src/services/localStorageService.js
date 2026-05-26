/**
 * Local Chat Storage Service
 * Persists conversation history locally for Electron app
 * Uses IndexedDB for reliability and offline support
 */

const DB_NAME = 'RonitWorkspaceDB';
const DB_VERSION = 1;
const STORE_NAME = 'chatHistory';
const SESSIONS_STORE = 'chatSessions';

let db = null;

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB initialization failed:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create chat history store
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Create sessions store
      if (!database.objectStoreNames.contains(SESSIONS_STORE)) {
        const sessionsStore = database.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        sessionsStore.createIndex('userId', 'userId', { unique: false });
        sessionsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

/**
 * Save a message to local storage
 * @param {string} userId - User ID
 * @param {string} sessionId - Chat session ID
 * @param {string} sender - 'user' or 'assistant'
 * @param {string} content - Message content
 * @returns {Promise<object>} - Saved message with ID
 */
export async function saveMessageLocal(userId, sessionId, sender, content) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const message = {
      userId,
      sessionId,
      sender,
      content,
      timestamp: Date.now(),
      synced: false, // Track if synced to Supabase
    };

    return new Promise((resolve, reject) => {
      const request = store.add(message);
      request.onsuccess = () => {
        resolve({ ...message, id: request.result });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving message locally:', error);
    throw error;
  }
}

/**
 * Get all messages for a session
 * @param {string} sessionId - Chat session ID
 * @returns {Promise<Array>} - Array of messages
 */
export async function getSessionMessages(sessionId) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('sessionId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(sessionId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error retrieving session messages:', error);
    return [];
  }
}

/**
 * Save a chat session
 * @param {object} sessionData - { id, userId, title, createdAt, updatedAt }
 * @returns {Promise<object>} - Saved session
 */
export async function saveSessionLocal(sessionData) {
  try {
    const database = await initDB();
    const transaction = database.transaction([SESSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);

    const session = {
      ...sessionData,
      synced: false, // Track if synced to Supabase
    };

    return new Promise((resolve, reject) => {
      const request = store.put(session);
      request.onsuccess = () => resolve(session);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving session locally:', error);
    throw error;
  }
}

/**
 * Get all chat sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of sessions
 */
export async function getUserSessions(userId) {
  try {
    const database = await initDB();
    const transaction = database.transaction([SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(SESSIONS_STORE);
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => {
        const sessions = request.result || [];
        // Sort by most recent first
        sessions.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(sessions);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error retrieving user sessions:', error);
    return [];
  }
}

/**
 * Get a specific session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<object|null>} - Session data or null
 */
export async function getSessionLocal(sessionId) {
  try {
    const database = await initDB();
    const transaction = database.transaction([SESSIONS_STORE], 'readonly');
    const store = transaction.objectStore(SESSIONS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(sessionId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    return null;
  }
}

/**
 * Update a session
 * @param {string} sessionId - Session ID
 * @param {object} updates - Updates to apply
 * @returns {Promise<object>} - Updated session
 */
export async function updateSessionLocal(sessionId, updates) {
  try {
    const database = await initDB();
    const transaction = database.transaction([SESSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(SESSIONS_STORE);

    const existing = await getSessionLocal(sessionId);
    if (!existing) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
}

/**
 * Delete a session and its messages
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
export async function deleteSessionLocal(sessionId) {
  try {
    const database = await initDB();

    // Delete session
    let transaction = database.transaction([SESSIONS_STORE], 'readwrite');
    let store = transaction.objectStore(SESSIONS_STORE);
    store.delete(sessionId);

    // Delete all messages in session
    transaction = database.transaction([STORE_NAME], 'readwrite');
    store = transaction.objectStore(STORE_NAME);
    const index = store.index('sessionId');
    const range = IDBKeyRange.only(sessionId);
    index.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

/**
 * Clear all data for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function clearUserData(userId) {
  try {
    const database = await initDB();

    // Get all user sessions
    const sessions = await getUserSessions(userId);

    // Delete all messages for user's sessions
    let transaction = database.transaction([STORE_NAME], 'readwrite');
    let store = transaction.objectStore(STORE_NAME);
    const messageIndex = store.index('userId');
    messageIndex.openCursor(IDBKeyRange.only(userId)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Delete all user sessions
    transaction = database.transaction([SESSIONS_STORE], 'readwrite');
    store = transaction.objectStore(SESSIONS_STORE);
    const sessionIndex = store.index('userId');
    sessionIndex.openCursor(IDBKeyRange.only(userId)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch (error) {
    console.error('Error clearing user data:', error);
    throw error;
  }
}

/**
 * Get storage statistics
 * @returns {Promise<object>} - Storage stats
 */
export async function getStorageStats() {
  try {
    const database = await initDB();

    let messageCount = 0;
    let sessionCount = 0;

    const msgTransaction = database.transaction([STORE_NAME], 'readonly');
    const msgStore = msgTransaction.objectStore(STORE_NAME);
    messageCount = await new Promise((resolve) => {
      const request = msgStore.count();
      request.onsuccess = () => resolve(request.result);
    });

    const sessTransaction = database.transaction([SESSIONS_STORE], 'readonly');
    const sessStore = sessTransaction.objectStore(SESSIONS_STORE);
    sessionCount = await new Promise((resolve) => {
      const request = sessStore.count();
      request.onsuccess = () => resolve(request.result);
    });

    return { messageCount, sessionCount };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { messageCount: 0, sessionCount: 0 };
  }
}

export default {
  saveMessageLocal,
  getSessionMessages,
  saveSessionLocal,
  getUserSessions,
  getSessionLocal,
  updateSessionLocal,
  deleteSessionLocal,
  clearUserData,
  getStorageStats,
};
