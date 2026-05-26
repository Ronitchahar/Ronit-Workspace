/**
 * Session Cleanup Service
 * Handles periodic cleanup of stale sessions and maintenance tasks
 */

import { cleanupStaleSessions } from "./sessionManagementService";

const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const STALE_SESSION_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 days

let cleanupTimer = null;
let isCleanupRunning = false;

/**
 * Perform a single cleanup cycle
 */
export async function performCleanupCycle(userId) {
  if (!userId) return { success: false, message: "User ID required" };

  if (isCleanupRunning) {
    return { success: false, message: "Cleanup already running" };
  }

  try {
    isCleanupRunning = true;

    const result = await cleanupStaleSessions(userId);

    if (result.error) {
      console.error("Error during cleanup cycle:", result.error);
      return {
        success: false,
        message: result.error,
      };
    }

    return {
      success: true,
      cleanedCount: result.cleanedCount,
      message: `Cleaned up ${result.cleanedCount} stale session(s)`,
    };
  } catch (error) {
    console.error("Unexpected error in cleanup cycle:", error);
    return {
      success: false,
      message: error.message || "Unknown error during cleanup",
    };
  } finally {
    isCleanupRunning = false;
  }
}

/**
 * Start periodic cleanup (call once on app init)
 * Cleans up stale sessions every 24 hours
 */
export function startPeriodicCleanup(userId) {
  if (!userId) {
    console.warn("Cannot start periodic cleanup without user ID");
    return;
  }

  // Perform cleanup immediately on startup
  performCleanupCycle(userId).catch((error) => {
    console.warn("Initial cleanup failed:", error);
  });

  // Schedule periodic cleanup
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
  }

  cleanupTimer = setInterval(() => {
    performCleanupCycle(userId).catch((error) => {
      console.warn("Periodic cleanup failed:", error);
    });
  }, CLEANUP_INTERVAL);

  console.log(
    "Session cleanup scheduled to run every 24 hours"
  );
}

/**
 * Stop periodic cleanup
 */
export function stopPeriodicCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log("Session cleanup scheduler stopped");
  }
}

/**
 * Get cleanup status
 */
export function getCleanupStatus() {
  return {
    isRunning: isCleanupRunning,
    hasSchedule: cleanupTimer !== null,
    cleanupInterval: CLEANUP_INTERVAL,
    staleThreshold: STALE_SESSION_THRESHOLD,
  };
}
