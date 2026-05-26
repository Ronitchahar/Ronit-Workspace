import { supabase } from "./supabase";
import { getCurrentUser } from "./authService";
import { requireUserId } from "./dbService";

async function getCurrentUserId() {
  const user = await getCurrentUser();
  return user ? user.id : null;
}

export async function getNotes() {
  const userId = await getCurrentUserId();
  if (!requireUserId(userId, "getNotes")) return [];

  console.log("[NOTES] getNotes() fetching for user:", userId);
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[NOTES] getNotes() fetch error FULL OBJECT:", error);
  } else {
    console.log(`[NOTES] getNotes() success. Fetched ${data?.length || 0} notes`);
  }

  return data || [];
}

export async function addNote(title, content) {
  const userId = await getCurrentUserId();
  console.log("[NOTES-INSERT] DEBUG: getCurrentUserId returned:", userId);
  
  if (!requireUserId(userId, "addNote")) {
    console.error("[NOTES-INSERT] ERROR: requireUserId check failed! userId:", userId);
    return null;
  }

  console.log("=== START ADD NOTE ===");
  console.log("[NOTES-INSERT] DEBUG: userId is valid:", userId);
  
  const payload = { title, content, user_id: userId };
  console.log("[NOTES-INSERT] DEBUG: payload being inserted:", JSON.stringify(payload));

  console.log("[NOTES-INSERT] DEBUG: About to call supabase.from('notes').insert()");
  const { data, error } = await supabase.from("notes").insert([payload]).select();
  
  console.log("[NOTES-INSERT] DEBUG: Supabase response received");
  console.log("[NOTES-INSERT] DEBUG: data:", data);
  console.log("[NOTES-INSERT] DEBUG: error:", error);
  
  if (error) {
    console.error("[NOTES-INSERT] CRITICAL ERROR! Full error object:");
    console.error("  - message:", error.message);
    console.error("  - code:", error.code);
    console.error("  - status:", error.status);
    console.error("  - details:", error.details);
    console.error("  - hint:", error.hint);
    console.error("  - Full object:", error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    console.warn("[NOTES-INSERT] WARNING: DB insert succeeded but returned no data. Possible RLS issue preventing select!");
    return { ...payload, id: `temp-${Date.now()}`, created_at: new Date().toISOString() };
  }

  const insertedNote = data[0];
  console.log("[NOTES-INSERT] SUCCESS! Inserted note with real DB ID:", insertedNote.id, "Content length:", insertedNote.content?.length || 0);
  console.log("=== END ADD NOTE SUCCESS ===");
  return insertedNote;
}

export async function updateNote(id, fields) {
  if (!id && id !== 0) {
    console.warn("[NOTES] updateNote() BLOCKED: id is null/undefined/falsy");
    return null;
  }
  
  // Note: Frontend prevents temp IDs from reaching here via isLocal check
  // All numeric or UUID IDs are valid at this layer
  
  console.log("[NOTES] updateNote() called - ID:", id, "Fields:", Object.keys(fields));
  let { data, error } = await supabase.from("notes").update(fields).eq("id", id).select();
  
  // Dynamic schema fallback: if 'pinned' or 'updated_at' doesn't exist in the DB, it throws a schema error.
  if (error && error.message && error.message.includes('Could not find the')) {
    console.warn(`[NOTES] updateNote() schema mismatch detected for ID ${id}. Stripping unsafe columns and retrying. Error: ${error.message}`);
    const safeFields = { ...fields };
    delete safeFields.pinned;
    delete safeFields.updated_at;
    
    // If there's nothing left to update after stripping, just return
    if (Object.keys(safeFields).length === 0) {
      console.warn("[NOTES] updateNote() nothing safe left to update. Bailing out gracefully.");
      return { id }; // return a stub so it doesn't crash UI
    }
    
    // Retry with safe fields
    const retry = await supabase.from("notes").update(safeFields).eq("id", id).select();
    data = retry.data;
    error = retry.error;
  }
  
  if (error) {
    console.error("[NOTES] updateNote() update error for ID:", id, "FULL OBJECT:", error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    console.warn(`[NOTES] updateNote() succeeded but no row returned for ID ${id}`);
    return null;
  }
  
  const updatedNote = data[0];
  console.log("[NOTES] updateNote() success! Updated note ID:", id, "Content length:", updatedNote.content?.length || 0);
  return updatedNote;
}

export async function deleteNote(id) {
  if (!id) {
    console.warn("[NOTES] deleteNote() BLOCKED: id is null/undefined");
    return;
  }
  
  console.log("[NOTES] deleteNote() called for ID:", id);
  
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) {
    console.error("[NOTES] deleteNote() error for ID:", id, "FULL OBJECT:", error);
    throw error;
  }
  console.log("[NOTES] deleteNote() success for ID:", id);
}
