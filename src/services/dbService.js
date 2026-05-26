import { supabase } from "./supabase";

/**
 * Centralized Database Service
 * Provides defensive checks for missing tables, columns, and relations.
 */

const PGRST_ERRORS = {
  MISSING_RELATION: "42P01",
  MISSING_COLUMN: "42703",
  FOREIGN_KEY_VIOLATION: "23503",
};

/**
 * Wrapper for Supabase queries to catch missing tables/columns gracefully
 * @param {Promise} queryPromise - The supabase query promise
 * @param {any} fallbackValue - The value to return if a structural DB error occurs
 * @returns {Promise<{data: any, error: any}>}
 */
export async function safeQuery(queryPromise, fallbackValue = []) {
  try {
    const { data, error } = await queryPromise;
    
    if (error) {
      // Check if the error is a structural missing element error
      if (
        error.code === PGRST_ERRORS.MISSING_RELATION ||
        error.code === PGRST_ERRORS.MISSING_COLUMN
      ) {
        console.warn(`[DB WARNING] Structual issue detected. Falling back gracefully. Error: ${error.message}`);
        return { data: fallbackValue, error: null };
      }
      
      // Log other errors but pass them back
      console.error(`[DB ERROR] ${error.message}`, error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error("[DB EXCEPTION]", err);
    return { data: fallbackValue, error: err };
  }
}

/**
 * Helper function to ensure an operation has a valid custom user ID.
 * Avoids throwing errors directly to prevent UI crashes.
 */
export function requireUserId(userId, operationName) {
  if (!userId) {
    console.error(`[DB REQUIREMENT] ${operationName} requires a valid userId.`);
    return false;
  }
  return true;
}
