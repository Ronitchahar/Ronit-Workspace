import { supabase } from "./supabase";
import { safeQuery, requireUserId } from "./dbService";

export async function getTasks(userId) {
  if (!requireUserId(userId, "getTasks")) return [];

  console.log("Fetching tasks for user:", userId);
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("-> Fetch tasks error FULL OBJECT:", error);
  } else {
    console.log(`-> Fetch tasks success. Count: ${data?.length}`);
  }

  return data || [];
}

export async function addTask(userId, task) {
  if (!requireUserId(userId, "addTask")) return null;

  console.log("=== START ADD TASK ===");
  const payload = {
    user_id: userId,
    title: task.title || "",
    description: task.description || "",
    due_date: task.due_date || null,
    priority: task.priority || 2,
    completed: false,
  };
  console.log("Task Payload:", payload);

  const { data, error } = await supabase.from("tasks").insert([payload]).select();

  if (error) {
    console.error("-> Task insert error FULL OBJECT:", error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    console.warn("-> DB insert succeeded but returned no data (Possible RLS issue preventing select!). Faking ID for UI.");
    return { ...payload, id: `temp-${Date.now()}`, created_at: new Date().toISOString() };
  }

  console.log("=== END ADD TASK SUCCESS ===");
  return data[0];
}

export async function updateTask(id, fields) {
  if (!id) return null;
  console.log(`Updating task ${id} with:`, fields);
  
  const { data, error } = await supabase.from("tasks").update(fields).eq("id", id).select();
  
  if (error) {
    console.error("-> Task update error FULL OBJECT:", error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    console.warn(`-> Task update succeeded but no row returned for ID ${id}`);
    return null;
  }
  
  return data[0];
}

export async function deleteTask(id) {
  if (!id) return;
  console.log(`Deleting task ${id}`);
  
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) {
    console.error("-> Task delete error FULL OBJECT:", error);
    throw error;
  }
  console.log(`-> Task ${id} deleted successfully`);
}
