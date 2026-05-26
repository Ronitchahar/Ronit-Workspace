import { supabase } from "./supabase";
import { safeQuery, requireUserId } from "./dbService";
import {
  encodeImageMessageText,
  parseImageMessageFromRow,
} from "./chatImageService";

export { parseImageMessageFromRow };

export async function getChatSessions(userId) {
  if (!requireUserId(userId, "getChatSessions")) return [];
  const { data } = await safeQuery(
    supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    []
  );

  return data || [];
}

export async function createChatSession(userId, title = "New Chat") {
  if (!requireUserId(userId, "createChatSession")) throw new Error("User ID required to create session");
  
  const { data, error } = await safeQuery(
    supabase.from("chat_sessions").insert([{ user_id: userId, title }]).select(),
    null
  );

  if (error) {
    console.error("Error creating chat session in DB:", error);
    throw new Error(`DB Insert Error: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    console.error("Chat session created but no data returned.");
    throw new Error("Chat session created but Supabase returned no data.");
  }
  
  return data[0];
}

export async function deleteChatSession(sessionId) {
  if (!sessionId) return;
  await safeQuery(supabase.from("chat_sessions").delete().eq("id", sessionId), null);
}

export async function updateChatSessionTitle(sessionId, title) {
  if (!sessionId) return;
  await safeQuery(
    supabase.from("chat_sessions").update({ title, updated_at: new Date() }).eq("id", sessionId),
    null
  );
}

export async function getChatHistory(sessionId) {
  if (!sessionId) return [];
  const { data } = await safeQuery(
    supabase
      .from("chat_history")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    []
  );

  return data || [];
}

export async function addChatMessage(userId, sessionId, sender, text) {
  if (!sessionId || !requireUserId(userId, "addChatMessage")) return null;
  
  const { data, error } = await safeQuery(
    supabase.from("chat_history").insert([{
      user_id: userId,
      session_id: sessionId,
      sender,
      text,
    }]).select(),
    null
  );

  if (error || !data || data.length === 0) {
    return null;
  }
  
  // Update session updated_at
  await safeQuery(
    supabase.from("chat_sessions").update({ updated_at: new Date() }).eq("id", sessionId),
    null
  );

  return data[0];
}

/**
 * Save image message with cloud URL metadata (Supabase Storage source of truth)
 */
export async function addChatImageMessage(userId, sessionId, sender, imageMeta) {
  if (!sessionId || !requireUserId(userId, "addChatImageMessage")) return null;

  const { prompt, imageUrl, imageId, storagePath } = imageMeta;
  const metadata = {
    type: "image",
    prompt: prompt || "",
    imageUrl,
    imageId: imageId || null,
    storagePath: storagePath || null,
  };

  const row = {
    user_id: userId,
    session_id: sessionId,
    sender,
    text: encodeImageMessageText(metadata),
    metadata,
  };

  let { data, error } = await supabase.from("chat_history").insert([row]).select();

  if (error?.message?.includes("metadata")) {
    const { metadata: _m, ...rowWithoutMeta } = row;
    ({ data, error } = await supabase.from("chat_history").insert([rowWithoutMeta]).select());
  }

  if (error || !data || data.length === 0) {
    console.error("addChatImageMessage error:", error);
    return null;
  }

  await safeQuery(
    supabase.from("chat_sessions").update({ updated_at: new Date() }).eq("id", sessionId),
    null
  );

  return data[0];
}

export async function clearChatHistory(userId) {
  if (!requireUserId(userId, "clearChatHistory")) return;
  await safeQuery(supabase.from("chat_history").delete().eq("user_id", userId), null);
}
