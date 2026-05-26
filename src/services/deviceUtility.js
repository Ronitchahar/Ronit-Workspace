/**
 * Device Utility Service
 * Handles device identification, detection, and persistence
 * Supports: Electron, Browser, Mobile
 */

import { stableStorageSet, stableStorageGet } from "./stableStorageService";

const DEVICE_ID_STORAGE_KEY = "workspace_device_id";
const DEVICE_INFO_STORAGE_KEY = "workspace_device_info";
const STALE_SESSION_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Generate a unique device ID using crypto
 * Format: deviceId-timestamp-random
 */
function generateDeviceId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `device-${timestamp}-${randomPart}`;
}

/**
 * Get or create persistent device ID
 * Stored in both localStorage and stable storage
 */
export async function getDeviceId() {
  try {
    // Try to get from localStorage first (fast)
    let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    
    if (!deviceId) {
      // Try stable storage (Electron)
      deviceId = stableStorageGet(DEVICE_ID_STORAGE_KEY);
    }
    
    if (!deviceId) {
      // Generate new device ID
      deviceId = generateDeviceId();
      
      // Store in both places for redundancy
      localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
      try {
        stableStorageSet(DEVICE_ID_STORAGE_KEY, deviceId);
      } catch (e) {
        console.warn("Failed to store device ID in stable storage:", e);
      }
    }
    
    return deviceId;
  } catch (error) {
    console.error("Error getting device ID:", error);
    // Fallback: generate temporary device ID
    return generateDeviceId();
  }
}

/**
 * Detect device name/platform
 * Returns: { platform, deviceName, userAgent, isElectron }
 */
export function detectDevicePlatform() {
  const userAgent = navigator.userAgent;
  let platform = "Unknown";
  let deviceName = "Unknown Device";
  let isElectron = false;

  // Check if running in Electron
  if (typeof window !== "undefined" && window.require) {
    isElectron = true;
    try {
      const electronApp = window.require("@electron/remote").app;
      deviceName = `${electronApp.getName()} (Electron)`;
      platform = process.platform;
    } catch (e) {
      platform = process.platform || "electron";
      deviceName = "Electron App";
    }
  }

  // Browser detection
  if (!isElectron) {
    if (userAgent.includes("Chrome") && !userAgent.includes("Chromium")) {
      platform = "Chrome";
      deviceName = "Chrome Browser";
    } else if (userAgent.includes("Safari")) {
      platform = "Safari";
      deviceName = "Safari Browser";
    } else if (userAgent.includes("Firefox")) {
      platform = "Firefox";
      deviceName = "Firefox Browser";
    } else if (userAgent.includes("Edge")) {
      platform = "Edge";
      deviceName = "Edge Browser";
    }

    // Mobile detection
    if (/Mobile|Android|iPhone|iPad|iPod/.test(userAgent)) {
      if (userAgent.includes("iPhone")) {
        deviceName = "iPhone";
        platform = "iOS";
      } else if (userAgent.includes("iPad")) {
        deviceName = "iPad";
        platform = "iOS";
      } else if (userAgent.includes("Android")) {
        deviceName = "Android Device";
        platform = "Android";
      } else {
        deviceName = "Mobile Device";
        platform = "Mobile";
      }
    }
  }

  return {
    platform,
    deviceName,
    userAgent,
    isElectron,
  };
}

/**
 * Store device info in local storage for persistence
 */
export function storeDeviceInfo(deviceId, platform, deviceName) {
  try {
    const deviceInfo = {
      id: deviceId,
      platform,
      deviceName,
      storedAt: Date.now(),
    };
    localStorage.setItem(DEVICE_INFO_STORAGE_KEY, JSON.stringify(deviceInfo));
    try {
      stableStorageSet(DEVICE_INFO_STORAGE_KEY, deviceInfo);
    } catch (e) {
      console.warn("Failed to store device info in stable storage:", e);
    }
  } catch (error) {
    console.error("Error storing device info:", error);
  }
}

/**
 * Get stored device info
 */
export function getStoredDeviceInfo() {
  try {
    const stored = localStorage.getItem(DEVICE_INFO_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error getting stored device info:", error);
  }
  return null;
}

/**
 * Clear device info (useful for logout/reset)
 */
export function clearDeviceInfo() {
  try {
    localStorage.removeItem(DEVICE_INFO_STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing device info:", error);
  }
}

/**
 * Check if a session is stale (older than STALE_SESSION_THRESHOLD)
 */
export function isSessionStale(lastActiveTimestamp) {
  if (!lastActiveTimestamp) return true;
  const now = Date.now();
  const age = now - new Date(lastActiveTimestamp).getTime();
  return age > STALE_SESSION_THRESHOLD;
}

/**
 * Get formatted device info for display
 */
export function getFormattedDeviceInfo(session) {
  if (!session) return null;
  
  return {
    id: session.device_id,
    name: session.device_name || "Unknown Device",
    platform: session.platform || "Unknown",
    loginTime: session.created_at ? new Date(session.created_at) : null,
    lastActive: session.last_active ? new Date(session.last_active) : null,
    isCurrentDevice: false, // Will be set in component
  };
}
