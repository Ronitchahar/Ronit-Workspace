/**
 * Session Management Service
 * Handles device session registration, updates, and cleanup
 * Works with Supabase active_sessions table
 */

import { supabase } from "./supabase";
import { safeQuery } from "./dbService";
import {
  getDeviceId,
  detectDevicePlatform,
  storeDeviceInfo,
  isSessionStale,
} from "./deviceUtility";

const MAX_ACTIVE_DEVICES = 3;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

/**
 * Register or update a session in active_sessions table
 * Returns: { success: boolean, sessionId?: string, error?: string }
 */
export async function registerSessionDevice(userId) {
  try {
    const deviceId = await getDeviceId();
    const { platform, deviceName } = detectDevicePlatform();

    // Validate inputs
    if (!userId || !deviceId) {
      throw new Error("Invalid user ID or device ID");
    }

    // Store device info locally
    storeDeviceInfo(deviceId, platform, deviceName);

    // Check for existing session from this device
    const { data: existingSession, error: checkError } = await safeQuery(
      supabase
        .from("active_sessions")
        .select("id, device_id, user_id")
        .eq("user_id", userId)
        .eq("device_id", deviceId)
        .single(),
      null
    );

    if (checkError && checkError.code !== "PGRST116") {
      // Error other than "not found"
      console.warn("Error checking existing session:", checkError);
    }

    if (existingSession) {
      // Update existing session
      const { error: updateError } = await safeQuery(
        supabase
          .from("active_sessions")
          .update({
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSession.id),
        null
      );

      if (updateError) {
        console.error("Error updating session:", updateError);
        throw new Error("Failed to update session");
      }

      return {
        success: true,
        sessionId: existingSession.id,
        isNew: false,
      };
    }

    // Create new session
    const { data: newSession, error: insertError } = await safeQuery(
      supabase
        .from("active_sessions")
        .insert([
          {
            user_id: userId,
            device_id: deviceId,
            device_name: deviceName,
            platform: platform,
            created_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select(),
      null
    );

    if (insertError || !newSession || newSession.length === 0) {
      console.error("Error creating session:", insertError);
      throw new Error("Failed to create session");
    }

    return {
      success: true,
      sessionId: newSession[0].id,
      isNew: true,
    };
  } catch (error) {
    console.error("Error registering session device:", error);
    return {
      success: false,
      error: error.message || "Failed to register session",
    };
  }
}

/**
 * Get active session count for user
 * Returns: { count: number, sessions: array, error?: string }
 */
export async function getActiveSessionCount(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { data: sessions, error } = await safeQuery(
      supabase
        .from("active_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("last_active", { ascending: false }),
      []
    );

    if (error) {
      console.error("Error fetching sessions:", error);
      throw error;
    }

    // Filter out stale sessions
    const activeSessions = (sessions || []).filter((s) => {
      return !isSessionStale(s.last_active);
    });

    return {
      count: activeSessions.length,
      sessions: activeSessions,
      maxDevices: MAX_ACTIVE_DEVICES,
    };
  } catch (error) {
    console.error("Error getting active session count:", error);
    return {
      count: 0,
      sessions: [],
      error: error.message,
      maxDevices: MAX_ACTIVE_DEVICES,
    };
  }
}

/**
 * Check if user can login (< MAX_ACTIVE_DEVICES)
 * Returns: { canLogin: boolean, activeCount: number, error?: string }
 */
export async function checkDeviceLimit(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { count, error } = await getActiveSessionCount(userId);

    if (error) {
      throw error;
    }

    return {
      canLogin: count < MAX_ACTIVE_DEVICES,
      activeCount: count,
      maxDevices: MAX_ACTIVE_DEVICES,
    };
  } catch (error) {
    console.error("Error checking device limit:", error);
    return {
      canLogin: false,
      activeCount: 0,
      error: error.message,
      maxDevices: MAX_ACTIVE_DEVICES,
    };
  }
}

/**
 * Deactivate a session
 * Returns: { success: boolean, error?: string }
 */
export async function deactivateSession(sessionId) {
  try {
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const { error } = await safeQuery(
      supabase
        .from("active_sessions")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", sessionId),
      null
    );

    if (error) {
      console.error("Error deactivating session:", error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error deactivating session:", error);
    return {
      success: false,
      error: error.message || "Failed to deactivate session",
    };
  }
}

/**
 * Deactivate all sessions for a user
 * Useful for "logout all other devices"
 * Returns: { success: boolean, deactivatedCount: number, error?: string }
 */
export async function deactivateAllSessions(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { data: sessions, error: fetchError } = await safeQuery(
      supabase
        .from("active_sessions")
        .select("id")
        .eq("user_id", userId),
      []
    );

    if (fetchError) {
      throw fetchError;
    }

    if (!sessions || sessions.length === 0) {
      return { success: true, deactivatedCount: 0 };
    }

    const { error: updateError } = await safeQuery(
      supabase
        .from("active_sessions")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId),
      null
    );

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      deactivatedCount: sessions.length,
    };
  } catch (error) {
    console.error("Error deactivating all sessions:", error);
    return {
      success: false,
      deactivatedCount: 0,
      error: error.message,
    };
  }
}

/**
 * Deactivate all sessions EXCEPT the given one
 * Useful for "logout all other devices"
 * Returns: { success: boolean, deactivatedCount: number, error?: string }
 */
export async function deactivateOtherSessions(userId, currentSessionId) {
  try {
    if (!userId || !currentSessionId) {
      throw new Error("User ID and current session ID are required");
    }

    const { data: sessions, error: fetchError } = await safeQuery(
      supabase
        .from("active_sessions")
        .select("id")
        .eq("user_id", userId)
        .neq("id", currentSessionId),
      []
    );

    if (fetchError) {
      throw fetchError;
    }

    if (!sessions || sessions.length === 0) {
      return { success: true, deactivatedCount: 0 };
    }

    const { error: updateError } = await safeQuery(
      supabase
        .from("active_sessions")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .neq("id", currentSessionId),
      null
    );

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      deactivatedCount: sessions.length,
    };
  } catch (error) {
    console.error("Error deactivating other sessions:", error);
    return {
      success: false,
      deactivatedCount: 0,
      error: error.message,
    };
  }
}

/**
 * Update session last_active timestamp
 * Used to keep sessions alive
 * Returns: { success: boolean, error?: string }
 */
export async function updateSessionActivity(sessionId) {
  try {
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const { error } = await safeQuery(
      supabase
        .from("active_sessions")
        .update({
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId),
      null
    );

    if (error) {
      console.warn("Error updating session activity:", error);
      // Don't throw - activity update is not critical
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.warn("Error updating session activity:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all active sessions for a user
 * Returns formatted session data
 * Returns: { sessions: array, error?: string }
 */
export async function getUserActiveSessions(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { data: sessions, error } = await safeQuery(
      supabase
        .from("active_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("last_active", { ascending: false }),
      []
    );

    if (error) {
      console.error("Error fetching user sessions:", error);
      throw error;
    }

    return {
      sessions: sessions || [],
    };
  } catch (error) {
    console.error("Error getting user active sessions:", error);
    return {
      sessions: [],
      error: error.message,
    };
  }
}

/**
 * Cleanup stale sessions (older than 30 days)
 * Should run periodically or on app startup
 * Returns: { cleanedCount: number, error?: string }
 */
export async function cleanupStaleSessions(userId) {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const { data: sessions, error: fetchError } = await safeQuery(
      supabase
        .from("active_sessions")
        .select("id, last_active")
        .eq("user_id", userId),
      []
    );

    if (fetchError) {
      throw fetchError;
    }

    const staleSessions = (sessions || []).filter((s) => {
      return isSessionStale(s.last_active);
    });

    if (staleSessions.length === 0) {
      return { cleanedCount: 0 };
    }

    const staleIds = staleSessions.map((s) => s.id);

    const { error: deleteError } = await safeQuery(
      supabase
        .from("active_sessions")
        .delete()
        .in("id", staleIds),
      null
    );

    if (deleteError) {
      console.error("Error deleting stale sessions:", deleteError);
      throw deleteError;
    }

    return { cleanedCount: staleSessions.length };
  } catch (error) {
    console.error("Error cleaning up stale sessions:", error);
    return {
      cleanedCount: 0,
      error: error.message,
    };
  }
}
