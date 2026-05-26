import { supabase } from "./supabase";
import { uploadFile } from "./filesService";
import { safeQuery, requireUserId } from "./dbService";
import { updateUserAvatarUrl } from "./authService";

const LOCAL_USER_ID = "local-workspace-user-id-1234";

export async function getProfile(userId) {
  if (userId === LOCAL_USER_ID) {
    const local = localStorage.getItem("local_profile");
    return local ? JSON.parse(local) : { username: "Guest User", bio: "" };
  }
  
  if (!requireUserId(userId, "getProfile")) return null;

  // Profiles are now managed in the 'users' table directly
  const { data } = await safeQuery(
    supabase.from('users').select('id, username, avatar_url').eq('id', userId).single(),
    null
  );
  
  return data;
}

export async function updateProfile(userId, fields) {
  if (userId === LOCAL_USER_ID) {
    const existing = await getProfile(userId);
    const updated = { ...existing, ...fields };
    localStorage.setItem("local_profile", JSON.stringify(updated));
    return updated;
  }

  if (!requireUserId(userId, "updateProfile")) return null;

  // If updating username, enforce uniqueness
  if (fields.username) {
    const trimmedUsername = fields.username.trim().toLowerCase();

    // Validate username
    if (trimmedUsername.length < 3) {
      throw new Error("Username must be at least 3 characters long.");
    }
    if (trimmedUsername.length > 50) {
      throw new Error("Username must not exceed 50 characters.");
    }

    // Check if username already exists (case-insensitive)
    const { data: existingUsers, error: checkError } = await safeQuery(
      supabase
        .from("users")
        .select("id")
        .ilike("username", trimmedUsername)
        .neq("id", userId),
      []
    );

    if (checkError) {
      console.error("Error checking username availability:", checkError);
      throw new Error("Failed to check username availability.");
    }

    if (existingUsers && existingUsers.length > 0) {
      throw new Error("Username already taken.");
    }

    // Update with trimmed, lowercase username
    fields.username = trimmedUsername;
  }

  const { data, error } = await safeQuery(
    supabase.from('users').update(fields).eq('id', userId).select(),
    null
  );

  if (error) {
    console.error("Error updating profile:", error);
    // Handle UNIQUE constraint violation
    if (error.code === "23505" || error.message.includes("duplicate")) {
      throw new Error("Username already taken.");
    }
    throw new Error("Failed to update profile.");
  }

  if (!data || data.length === 0) {
    throw new Error("Failed to update profile.");
  }

  // If username was updated, update local storage
  if (fields.username && data[0]) {
    const stored = localStorage.getItem("workspace_auth_user");
    if (stored) {
      try {
        const userObj = JSON.parse(stored);
        userObj.username = data[0].username;
        localStorage.setItem("workspace_auth_user", JSON.stringify(userObj));
      } catch (e) {
        console.warn("Failed to update username in localStorage:", e);
      }
    }
  }

  return data[0];
}

export async function uploadAvatar(file, userId) {
  if (userId === LOCAL_USER_ID) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const updated = await updateProfile(userId, { avatar_url: reader.result });
        window.dispatchEvent(new CustomEvent('avatar_updated', { detail: reader.result }));
        resolve(updated);
      };
      reader.readAsDataURL(file);
    });
  }

  const uploaded = await uploadFile(file, userId);
  if (!uploaded) return null;
  
  // Use authService's updater to ensure local storage syncs
  await updateUserAvatarUrl(userId, uploaded.url);
  
  window.dispatchEvent(new CustomEvent('avatar_updated', { detail: uploaded.url }));
  
  return await getProfile(userId);
}

/**
 * Check if a username is available
 * Used for real-time validation during signup/profile update
 */
export async function checkUsernameAvailability(username, excludeUserId = null) {
  try {
    if (!username || username.trim().length === 0) {
      return { available: false, reason: "Username is required." };
    }

    const trimmedUsername = username.trim().toLowerCase();

    if (trimmedUsername.length < 3) {
      return { available: false, reason: "Username must be at least 3 characters." };
    }

    if (trimmedUsername.length > 50) {
      return { available: false, reason: "Username must not exceed 50 characters." };
    }

    let query = supabase
      .from("users")
      .select("id")
      .ilike("username", trimmedUsername);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data, error } = await safeQuery(query, []);

    if (error) {
      console.error("Error checking username:", error);
      throw error;
    }

    return {
      available: !data || data.length === 0,
    };
  } catch (error) {
    console.error("Error in checkUsernameAvailability:", error);
    return { available: false, error: error.message };
  }
}
