import { supabase } from "./supabase";
import { safeQuery } from "./dbService";
import {
  registerSessionDevice,
  checkDeviceLimit,
  deactivateSession,
  cleanupStaleSessions,
  updateSessionActivity,
} from "./sessionManagementService";
import { clearDeviceInfo } from "./deviceUtility";

const AUTH_STORAGE_KEY = "workspace_auth_user";
const SESSION_ID_KEY = "workspace_session_id";

export async function signUp(username, password) {
  // Validate inputs
  if (!username || !password) {
    throw new Error("Username and password are required.");
  }

  const trimmedUsername = username.trim().toLowerCase();
  
  if (trimmedUsername.length < 3) {
    throw new Error("Username must be at least 3 characters long.");
  }

  if (trimmedUsername.length > 50) {
    throw new Error("Username must not exceed 50 characters.");
  }

  // Check if username exists (before DB constraint)
  const { data: existingUsers, error: checkError } = await safeQuery(
    supabase
      .from("users")
      .select("username, avatar_url")
      .ilike("username", trimmedUsername),
    []
  );

  if (checkError) {
    console.error("Username check error:", checkError);
    throw new Error("Failed to check username availability.");
  }

  if (existingUsers && existingUsers.length > 0) {
    throw new Error("Username already taken.");
  }

  // Insert new user
  const { data, error } = await safeQuery(
    supabase
      .from("users")
      .insert([{ username: trimmedUsername, password }])
      .select(),
    null
  );

  if (error) {
    console.error("SignUp error:", error);
    // Handle UNIQUE constraint violation (23505)
    if (error.code === "23505" || error.message.includes("duplicate")) {
      throw new Error("Username already taken.");
    }
    throw new Error(error ? error.message : "Failed to create user.");
  }

  if (!data || data.length === 0) {
    throw new Error("Failed to create user.");
  }

  const userRecord = data[0];

  // Store in localStorage
  const userObj = {
    id: userRecord.id,
    username: userRecord.username,
    avatar_url: userRecord.avatar_url || null,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userObj));

  return userObj;
}

export async function signIn(username, password) {
  try {
    // Validate inputs
    if (!username || !password) {
      throw new Error("Username and password are required.");
    }

    const trimmedUsername = username.trim().toLowerCase();

    // Fetch user
    const { data, error } = await safeQuery(
      supabase
        .from("users")
        .select("id, username, password, avatar_url")
        .ilike("username", trimmedUsername),
      []
    );

    if (error || !data || data.length === 0) {
      throw new Error("Invalid username or password.");
    }

    const userRecord = data[0];

    // Validate password
    if (userRecord.password !== password) {
      throw new Error("Invalid username or password.");
    }

    // Check device limit BEFORE creating session
    const deviceLimitCheck = await checkDeviceLimit(userRecord.id);
    if (!deviceLimitCheck.canLogin) {
      throw new Error(
        `Maximum active devices reached (${deviceLimitCheck.activeCount}/${deviceLimitCheck.maxDevices}). Please logout from another device first.`
      );
    }

    // Register or update session device
    const sessionResult = await registerSessionDevice(userRecord.id);
    if (!sessionResult.success) {
      console.error("Failed to register session device:", sessionResult.error);
      throw new Error("Failed to establish session. Please try again.");
    }

    // Store user info in localStorage
    const userObj = {
      id: userRecord.id,
      username: userRecord.username,
      avatar_url: userRecord.avatar_url || null,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userObj));

    // Store session ID for later use
    localStorage.setItem(SESSION_ID_KEY, sessionResult.sessionId);

    return {
      ...userObj,
      sessionId: sessionResult.sessionId,
    };
  } catch (error) {
    console.error("SignIn error:", error);
    throw error;
  }
}

export async function signOut() {
  try {
    // Get session ID
    const sessionId = localStorage.getItem(SESSION_ID_KEY);

    // Deactivate session if exists
    if (sessionId) {
      try {
        await deactivateSession(sessionId);
      } catch (e) {
        console.warn("Failed to deactivate session:", e);
        // Continue logout even if session deactivation fails
      }
    }

    // Clear all auth-related data
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    clearDeviceInfo();

    return true;
  } catch (error) {
    console.error("SignOut error:", error);
    // Always clear local data even if DB operation fails
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    clearDeviceInfo();
    return true;
  }
}

export async function getCurrentUser() {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    try {
      const user = JSON.parse(stored);
      
      // Try to update session activity
      const sessionId = localStorage.getItem(SESSION_ID_KEY);
      if (sessionId && user?.id) {
        try {
          await updateSessionActivity(sessionId);
        } catch (e) {
          console.warn("Failed to update session activity:", e);
          // Don't fail getCurrentUser if activity update fails
        }
      }
      
      return user;
    } catch (e) {
      console.error("Error parsing stored user:", e);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(SESSION_ID_KEY);
      return null;
    }
  }
  return null;
}

// Deprecated for custom auth, kept for compatibility if needed elsewhere
export function onAuthStateChange(callback) {
  // Return a dummy unsubscribe function
  return { data: { subscription: { unsubscribe: () => {} } } };
}

/**
 * Get current session ID
 */
export function getCurrentSessionId() {
  return localStorage.getItem(SESSION_ID_KEY);
}

/**
 * Store session ID (called during login)
 */
export function setCurrentSessionId(sessionId) {
  if (sessionId) {
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  } else {
    localStorage.removeItem(SESSION_ID_KEY);
  }
}

/**
 * Cleanup stale sessions on app startup
 * Useful to remove old device sessions that block login
 */
export async function cleanupStaleDeviceSessions(userId) {
  if (!userId) return { cleanedCount: 0 };
  
  try {
    const result = await cleanupStaleSessions(userId);
    if (result.cleanedCount > 0) {
      console.log(`Cleaned up ${result.cleanedCount} stale sessions`);
    }
    return result;
  } catch (error) {
    console.warn("Error cleaning up stale sessions:", error);
    return { cleanedCount: 0, error: error.message };
  }
}

// Upload and set user avatar
export async function updateUserAvatarUrl(userId, avatarUrl) {
  if (!avatarUrl || !userId) return null;

  // 1. Update users table directly (Bypassing Storage bucket to avoid RLS issues)
  const { error: updateError } = await safeQuery(
    supabase
      .from("users")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId),
    null
  );

  if (updateError) {
    console.error("Users table avatar update error:", updateError);
    throw new Error("Failed to link avatar to profile.");
  }

  // 2. Update local storage userObj
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    try {
      const userObj = JSON.parse(stored);
      userObj.avatar_url = avatarUrl;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userObj));
    } catch (e) {}
  }

  return avatarUrl;
}
