/**
 * Image Storage Service
 * Supabase Storage = source of truth
 * IndexedDB = optional local cache
 * Electron filesystem = optional desktop fallback
 */

import { uploadImageToSupabase, deleteImageFromSupabase } from './chatImageService';

const IMAGE_DB_NAME = 'RonitWorkspaceImages';
const IMAGE_DB_VERSION = 1;
const IMAGE_STORE_NAME = 'images';

let imagesDir = null;
let imageDb = null;

function canUseNodeRequire() {
  return typeof window !== 'undefined' && typeof window.require === 'function';
}

function generateImageId() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

function isImageId(value) {
  return typeof value === 'string' && value.startsWith('img-');
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function initImageDB() {
  return new Promise((resolve, reject) => {
    if (imageDb) {
      resolve(imageDb);
      return;
    }

    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(IMAGE_DB_NAME, IMAGE_DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      imageDb = request.result;
      resolve(imageDb);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        const store = database.createObjectStore(IMAGE_STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('sessionId', 'sessionId', { unique: false });
      }
    };
  });
}

/**
 * Save image blob to IndexedDB
 * @returns {Promise<string>} imageId
 */
export async function saveImageToIndexedDB(imageBlob, prompt, sessionId = null, extra = {}) {
  const database = await initImageDB();
  const imageId = extra.imageId || generateImageId();
  const mimeType = imageBlob.type || 'image/png';

  const record = {
    id: imageId,
    blob: imageBlob,
    prompt: prompt || '',
    createdAt: Date.now(),
    mimeType,
    sessionId,
    imageUrl: extra.imageUrl || null,
    storagePath: extra.storagePath || null,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([IMAGE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => {
      console.log(`✅ Image saved to IndexedDB: ${imageId}`);
      resolve(imageId);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load image from IndexedDB by id
 * @returns {Promise<string|null>} blob URL or data URL for display
 */
export async function loadImageFromIndexedDB(imageId) {
  if (!imageId || !isImageId(imageId)) return null;

  try {
    const database = await initImageDB();

    const record = await new Promise((resolve, reject) => {
      const transaction = database.transaction([IMAGE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.get(imageId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!record?.blob) return null;

    const blob = record.blob instanceof Blob ? record.blob : new Blob([record.blob], { type: record.mimeType || 'image/png' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn(`Could not load image ${imageId} from IndexedDB:`, error.message);
    return null;
  }
}

/**
 * Delete image from IndexedDB
 */
export async function deleteImageFromIndexedDB(imageId) {
  if (!imageId || !isImageId(imageId)) return true;

  try {
    const database = await initImageDB();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction([IMAGE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IMAGE_STORE_NAME);
      const request = store.delete(imageId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    console.log(`✅ Image deleted from IndexedDB: ${imageId}`);
    return true;
  } catch (error) {
    console.warn(`Could not delete image ${imageId}:`, error.message);
    return false;
  }
}

/**
 * Migrate legacy base64 data URL into IndexedDB, return imageId
 */
export async function migrateDataUrlToIndexedDB(dataUrl, prompt) {
  if (!isDataUrl(dataUrl)) return null;

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return saveImageToIndexedDB(blob, prompt);
  } catch (error) {
    console.warn('Failed to migrate data URL to IndexedDB:', error.message);
    return null;
  }
}

/**
 * Initialize image storage
 */
export async function initializeImageStorage() {
  try {
    if (typeof indexedDB !== 'undefined') {
      await initImageDB();
    }
  } catch (error) {
    console.warn('IndexedDB image storage init warning:', error.message);
  }

  if (!canUseNodeRequire()) {
    return { success: true, mode: 'indexeddb' };
  }

  try {
    const electron = window.require('electron');
    const fs = window.require('fs').promises;
    const path = window.require('path');
    const app = electron.app || electron.remote?.app;

    if (!app) {
      return { success: true, mode: 'indexeddb' };
    }

    const baseDir = app.getPath('userData');
    imagesDir = path.join(baseDir, 'generated-images');
    await fs.mkdir(imagesDir, { recursive: true });
    console.log(`✅ Image storage initialized at: ${imagesDir}`);

    return { success: true, mode: 'filesystem', path: imagesDir };
  } catch (error) {
    console.warn('Filesystem image storage unavailable:', error.message);
    return { success: true, mode: 'indexeddb' };
  }
}

/**
 * Persist generated image: Supabase Storage (cloud) + IndexedDB (cache)
 * @returns {{ imageId: string, imageUrl: string, storagePath: string }}
 */
export async function persistGeneratedImage(imageBlob, userId, sessionId, prompt) {
  if (!imageBlob || imageBlob.size === 0) {
    throw new Error('Invalid image blob');
  }

  const cloud = await uploadImageToSupabase(imageBlob, userId, sessionId, prompt);

  try {
    await saveImageToIndexedDB(imageBlob, prompt, sessionId, {
      imageId: cloud.imageId,
      imageUrl: cloud.imageUrl,
      storagePath: cloud.storagePath,
    });
  } catch (cacheError) {
    console.warn('IndexedDB cache skipped:', cacheError.message);
  }

  return cloud;
}

/**
 * Save image blob — legacy; prefer persistGeneratedImage for chat images
 * Returns imageId (browser) or file path (electron)
 */
export async function saveImageToFile(imageBlob, prompt, sessionId = null, userId = null) {
  if (userId) {
    const result = await persistGeneratedImage(imageBlob, userId, sessionId, prompt);
    return result.imageId;
  }
  try {
    if (!imageBlob || imageBlob.size === 0) {
      throw new Error('Invalid image blob');
    }

    if (canUseNodeRequire()) {
      const sanitizedPrompt = prompt
        .substring(0, 30)
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase();
      const timestamp = Date.now();
      const filename = `img-${sanitizedPrompt}-${timestamp}.png`;

      try {
        const electron = window.require('electron');
        const fs = window.require('fs').promises;
        const path = window.require('path');
        const app = electron.app || electron.remote?.app;

        if (app) {
          const userDataPath = app.getPath('userData');
          const imageDirPath = path.join(userDataPath, 'generated-images');
          await fs.mkdir(imageDirPath, { recursive: true });

          const buffer = Buffer.from(await imageBlob.arrayBuffer());
          const filePath = path.join(imageDirPath, filename);
          await fs.writeFile(filePath, buffer);

          console.log(`✅ Image saved to: ${filePath}`);
          return filePath;
        }
      } catch (electronError) {
        console.warn('Electron fs not available, using IndexedDB:', electronError.message);
      }
    }

    return saveImageToIndexedDB(imageBlob, prompt, sessionId);
  } catch (error) {
    console.error('❌ Error saving image:', error);
    throw error;
  }
}

/**
 * Load image by imageId, file path, or legacy data URL
 */
/**
 * Resolve display URL: cloud URL first, then IndexedDB cache
 */
export async function resolveImageDisplayUrl(imageUrl, imageId) {
  if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
    return imageUrl;
  }
  if (imageId) {
    return loadImageFromFile(imageId);
  }
  return null;
}

export async function loadImageFromFile(imageRef) {
  try {
    if (!imageRef) return null;

    if (isDataUrl(imageRef) || imageRef.startsWith('blob:') || imageRef.startsWith('http://') || imageRef.startsWith('https://')) {
      return imageRef;
    }

    if (isImageId(imageRef)) {
      return loadImageFromIndexedDB(imageRef);
    }

    if (canUseNodeRequire()) {
      try {
        const fs = window.require('fs').promises;
        const buffer = await fs.readFile(imageRef);
        const blob = new Blob([buffer], { type: 'image/png' });
        return blobToDataURL(blob);
      } catch (fileError) {
        console.warn(`Could not load image from ${imageRef}:`, fileError.message);
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error loading image:', error);
    return null;
  }
}

/**
 * Delete image by imageId or file path
 */
export async function deleteImageFile(imageRef, storagePath = null) {
  try {
    if (storagePath) {
      await deleteImageFromSupabase(storagePath);
    }

    if (!imageRef || isDataUrl(imageRef)) {
      return true;
    }

    if (imageRef.startsWith('http')) {
      return true;
    }

    if (isImageId(imageRef)) {
      return deleteImageFromIndexedDB(imageRef);
    }

    if (!canUseNodeRequire()) {
      return true;
    }

    const fs = window.require('fs').promises;
    await fs.unlink(imageRef);
    console.log(`✅ Image deleted: ${imageRef}`);
    return true;
  } catch (error) {
    console.warn(`Could not delete image: ${error.message}`);
    return false;
  }
}

/**
 * Cleanup old images from IndexedDB
 */
export async function cleanupOldImages(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
  let deleted = 0;

  if (typeof indexedDB !== 'undefined') {
    try {
      const database = await initImageDB();
      const now = Date.now();

      const records = await new Promise((resolve, reject) => {
        const transaction = database.transaction([IMAGE_STORE_NAME], 'readonly');
        const store = transaction.objectStore(IMAGE_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      for (const record of records) {
        if (now - (record.createdAt || 0) > maxAgeMs) {
          await deleteImageFromIndexedDB(record.id);
          deleted++;
        }
      }
    } catch (error) {
      console.warn('IndexedDB cleanup failed:', error.message);
    }
  }

  if (canUseNodeRequire() && imagesDir) {
    try {
      const fs = window.require('fs').promises;
      const path = window.require('path');
      const files = await fs.readdir(imagesDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(imagesDir, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          deleted++;
        }
      }
    } catch (error) {
      console.warn('Filesystem cleanup failed:', error.message);
    }
  }

  if (deleted > 0) {
    console.log(`✅ Cleaned up ${deleted} old images`);
  }

  return deleted;
}
