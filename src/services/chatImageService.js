/**
 * Supabase Storage — cloud source of truth for generated chat images
 * Bucket: chat-images (public read, authenticated upload)
 */

import { supabase } from './supabase';

export const CHAT_IMAGES_BUCKET = 'chat-images';
export const IMAGE_META_PREFIX = '__RW_IMAGE_META__:';

function generateImageId() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isPublicImageUrl(value) {
  return (
    typeof value === 'string' &&
    (value.startsWith('https://') || value.startsWith('http://'))
  );
}

/**
 * Upload generated image blob to Supabase Storage
 * @returns {{ imageId: string, imageUrl: string, storagePath: string }}
 */
export async function uploadImageToSupabase(imageBlob, userId, sessionId, prompt = '') {
  if (!imageBlob || imageBlob.size === 0) {
    throw new Error('Invalid image blob');
  }
  if (!userId) {
    throw new Error('User ID required for cloud image upload');
  }

  const imageId = generateImageId();
  const sanitizedPrompt = (prompt || 'image')
    .substring(0, 30)
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();
  const storagePath = `${userId}/${sessionId || 'no-session'}/${imageId}-${sanitizedPrompt}.png`;

  const file =
    imageBlob instanceof File
      ? imageBlob
      : new File([imageBlob], `${imageId}.png`, { type: imageBlob.type || 'image/png' });

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(CHAT_IMAGES_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type || 'image/png',
    });

  if (uploadError) {
    console.error('Supabase chat-images upload error:', uploadError);
    throw uploadError;
  }

  const pathForUrl = uploadData?.path || storagePath;
  const { data: publicUrlData } = supabase.storage
    .from(CHAT_IMAGES_BUCKET)
    .getPublicUrl(pathForUrl);

  const imageUrl = publicUrlData?.publicUrl;
  if (!imageUrl) {
    throw new Error('Failed to get public URL for uploaded image');
  }

  console.log(`✅ Image uploaded to Supabase Storage: ${imageUrl}`);
  return { imageId, imageUrl, storagePath: pathForUrl };
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteImageFromSupabase(storagePath) {
  if (!storagePath) return true;

  try {
    const { error } = await supabase.storage
      .from(CHAT_IMAGES_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.warn('Supabase image delete warning:', error.message);
      return false;
    }
    console.log(`✅ Image removed from Supabase Storage: ${storagePath}`);
    return true;
  } catch (error) {
    console.warn('Supabase image delete failed:', error.message);
    return false;
  }
}

/**
 * Encode image metadata into chat_history.text (portable sync payload)
 */
export function encodeImageMessageText(meta) {
  return `${IMAGE_META_PREFIX}${JSON.stringify({
    type: 'image',
    prompt: meta.prompt || '',
    imageUrl: meta.imageUrl,
    imageId: meta.imageId,
    storagePath: meta.storagePath || null,
  })}`;
}

/**
 * Decode image metadata from chat_history row
 */
export function parseImageMessageFromRow(row) {
  if (!row) return null;

  const meta = row.metadata;
  if (meta?.type === 'image' && isPublicImageUrl(meta.imageUrl)) {
    return {
      type: 'image',
      prompt: meta.prompt || '',
      imageUrl: meta.imageUrl,
      imageId: meta.imageId || null,
      storagePath: meta.storagePath || null,
    };
  }

  const text = row.text || row.content || '';
  if (text.startsWith(IMAGE_META_PREFIX)) {
    try {
      const parsed = JSON.parse(text.slice(IMAGE_META_PREFIX.length));
      if (parsed?.type === 'image' && isPublicImageUrl(parsed.imageUrl)) {
        return parsed;
      }
    } catch {
      /* fall through */
    }
  }

  return null;
}

/**
 * Legacy placeholder text without embedded URL
 */
export function parseLegacyImagePlaceholder(text) {
  if (!text) return null;
  if (text.startsWith('Generated image:')) {
    return { prompt: text.replace(/^Generated image:\s*/, '').trim() };
  }
  if (text.startsWith('Regenerated image:')) {
    return { prompt: text.replace(/^Regenerated image:\s*/, '').trim() };
  }
  return null;
}
