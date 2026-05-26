import { supabase } from "./supabase";
import { safeQuery, requireUserId } from "./dbService";

const LOCAL_USER_ID = "local-workspace-user-id-1234";

// Uploads a file to Supabase Storage and creates a metadata row in `files` table.
export async function uploadFile(file, userId) {
  console.log("=== START UPLOAD FLOW ===");
  console.log("File info:", { name: file.name, size: file.size, type: file.type });
  console.log("UserId:", userId);

  if (!file) throw new Error("No file provided");

  if (userId === LOCAL_USER_ID) {
    // ... local logic omitted for brevity but keeping it functional
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const fileRecord = {
            id: Date.now().toString(),
            name: file.name,
            size: file.size,
            content_type: file.type,
            url: reader.result,
            user_id: userId,
            created_at: new Date().toISOString()
          };
          const existing = JSON.parse(localStorage.getItem('local_files') || '[]');
          existing.unshift(fileRecord);
          localStorage.setItem('local_files', JSON.stringify(existing));
          resolve(fileRecord);
        } catch (e) {
          reject(new Error("Local storage quota exceeded. File might be too large."));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  // Sanitize file name to avoid upload errors with spaces, colons (like in screenshots), or special chars
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  
  // Ensure uploaded file path is unique: userId/timestamp_filename.ext
  // Do NOT include the bucket name in the path string.
  const filePath = `${userId || 'anon'}/${Date.now()}_${sanitizedName}`;

  console.log("1. Starting Supabase storage upload to path:", filePath);
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("uploads")
    .upload(filePath, file, { 
      cacheControl: "3600", 
      upsert: false,
      contentType: file.type
    });

  if (uploadError) {
    console.error("-> Storage upload error FULL OBJECT:", uploadError);
    throw uploadError;
  }

  console.log("-> Upload success! uploadData:", uploadData);
  if (uploadData) {
    console.log("-> verify data.path:", uploadData.path);
    console.log("-> verify data.fullPath:", uploadData.fullPath);
  }

  const pathForUrl = uploadData?.path || filePath;

  console.log("2. Generating public URL for path:", pathForUrl);
  const { data: publicUrlData } = supabase.storage
    .from("uploads")
    .getPublicUrl(pathForUrl);
    
  console.log("-> Public URL generated:", publicUrlData?.publicUrl);

  const fileRecord = {
    path: pathForUrl,
    name: file.name,
    size: file.size,
    content_type: file.type,
    url: publicUrlData?.publicUrl,
    user_id: userId || null,
  };

  console.log("3. Starting DB insert into 'files' table with record:", fileRecord);

  // Directly use supabase.from instead of safeQuery to see exactly what is returned without catching
  const { data, error } = await supabase.from("files").insert([fileRecord]).select();

  console.log("-> DB Insert Result -> data:", data, "error:", error);

  if (error) {
    console.error("-> Metadata insert error FULL OBJECT:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.warn("-> DB insert succeeded but returned no data (Possible RLS issue preventing select!). Faking ID for UI.");
    return { ...fileRecord, id: `temp-${Date.now()}`, created_at: new Date().toISOString() };
  }

  console.log("=== END UPLOAD FLOW SUCCESS ===");
  return data[0];
}

export async function getFiles(userId) {
  if (userId === LOCAL_USER_ID) {
    return JSON.parse(localStorage.getItem('local_files') || '[]');
  }

  if (!requireUserId(userId, "getFiles")) return [];

  console.log("Fetching files for user:", userId);

  // Direct query to see raw DB errors if any
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
    
  if (error) {
    console.error("-> Fetch files error FULL OBJECT:", error);
  } else {
    console.log(`-> Fetch files success. Count: ${data?.length}`);
  }

  return data || [];
}

export async function deleteFileService(fileId, filePath, userId) {
  if (userId === LOCAL_USER_ID) {
    const existing = JSON.parse(localStorage.getItem('local_files') || '[]');
    const updated = existing.filter(f => f.id !== fileId);
    localStorage.setItem('local_files', JSON.stringify(updated));
    return true;
  }

  if (!requireUserId(userId, "deleteFileService")) return false;

  console.log("=== START DELETE FILE FLOW ===");
  console.log(`Deleting fileId: ${fileId}, path: ${filePath}`);

  // 1. Delete from Supabase Storage
  if (filePath) {
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .remove([filePath]);
      
    if (storageError) {
      console.error("-> Storage delete error FULL OBJECT:", storageError);
      // Continue to DB deletion even if storage fails (file might already be gone)
    } else {
      console.log("-> Storage delete success for path:", filePath);
    }
  }

  // 2. Delete from DB
  const { error: dbError } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId)
    .eq("user_id", userId); // extra safety

  if (dbError) {
    console.error("-> DB delete error FULL OBJECT:", dbError);
    throw dbError;
  }

  console.log("-> DB delete success");
  console.log("=== END DELETE FILE FLOW ===");
  return true;
}
