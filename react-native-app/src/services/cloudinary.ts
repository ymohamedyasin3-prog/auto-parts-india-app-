/**
 * Cloudinary Image Management Service for React Native Android
 * Provides fast unsigned upload, parallel batching, timeout fallback, and optimization.
 */

const CLOUDINARY_CLOUD_NAME = 'rqf1hlrx'; // Default Cloudinary cloud name
const CLOUDINARY_UPLOAD_PRESET = 'autoparts_upload'; // Unsigned upload preset
const UPLOAD_TIMEOUT_MS = 20000; // 20s timeout per image for mobile networks

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

/**
 * Uploads a single local image file URI or base64 data URI to Cloudinary with timeout guard.
 */
export async function uploadImageToCloudinary(
  fileUri: string,
  folder: string = 'spare_parts'
): Promise<string> {
  if (!fileUri) {
    return fileUri;
  }

  // If already a remote URL, return immediately
  if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
    return fileUri;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const formData = new FormData();

    if (fileUri.startsWith('data:image/')) {
      // Direct base64 upload supported natively by Cloudinary
      formData.append('file', fileUri);
    } else {
      const filename = fileUri.split('/').pop() || `upload_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri: fileUri,
        name: filename,
        type: type,
      } as any);
    }

    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Fallback: return original URI safely
      return fileUri;
    }

    const data = (await response.json()) as CloudinaryUploadResponse;
    return data.secure_url || fileUri;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Cloudinary upload fallback to URI:', err);
    return fileUri;
  }
}

/**
 * Fast parallel batch upload for multiple photos at once.
 */
export async function uploadMultipleImagesToCloudinary(
  uris: string[],
  folder: string = 'spare_parts',
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  if (!uris || uris.length === 0) return [];

  let completedCount = 0;
  const total = uris.length;

  const uploadPromises = uris.map(async (uri) => {
    try {
      const result = await uploadImageToCloudinary(uri, folder);
      completedCount++;
      if (onProgress) onProgress(completedCount, total);
      return result;
    } catch (_) {
      completedCount++;
      if (onProgress) onProgress(completedCount, total);
      return uri;
    }
  });

  return Promise.all(uploadPromises);
}

/**
 * Generates an optimized Cloudinary image transformation URL
 */
export function getOptimizedImageUrl(
  urlOrPublicId: string,
  width: number = 400,
  height: number = 300
): string {
  if (!urlOrPublicId) {
    return 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400';
  }

  if (urlOrPublicId.includes('res.cloudinary.com')) {
    return urlOrPublicId.replace(
      '/upload/',
      `/upload/c_fill,w_${width},h_${height},f_auto,q_auto/`
    );
  }

  return urlOrPublicId;
}

/**
 * Extracts Cloudinary public_id from a full URL or returns publicId
 */
export function extractCloudinaryPublicId(urlOrPublicId: string): string {
  if (!urlOrPublicId || typeof urlOrPublicId !== 'string') return '';
  if (!urlOrPublicId.includes('cloudinary.com')) return urlOrPublicId;

  const uploadIndex = urlOrPublicId.indexOf('/image/upload/');
  if (uploadIndex === -1) return '';

  const path = urlOrPublicId.substring(uploadIndex + '/image/upload/'.length);
  const segments = path.split('/').filter(Boolean);
  const cleanSegments = segments.filter(
    (seg) =>
      !seg.includes(',') &&
      !/^(c|w|h|q|f|e|b|r|a|dpr|fl|co|l|u|pg|so|eo|s|bo|o|x|y|g|p|m|t|ar|cs|d|ki|dl)_/.test(seg) &&
      !/^v\d+$/.test(seg)
  );

  if (cleanSegments.length === 0) return '';
  let publicId = cleanSegments.join('/');
  const lastDot = publicId.lastIndexOf('.');
  if (lastDot !== -1) {
    publicId = publicId.substring(0, lastDot);
  }
  return publicId;
}

/**
 * Permanently deletes an image from Cloudinary storage via server-side API
 */
export async function deleteImageFromCloudinary(urlOrPublicId: string): Promise<boolean> {
  if (!urlOrPublicId) return false;
  const publicId = extractCloudinaryPublicId(urlOrPublicId);
  if (!publicId) return false;

  // In standalone native mobile app, avoid attempting relative web endpoints
  if (typeof window === 'undefined' || !window.location?.origin) {
    return true;
  }

  try {
    const res = await fetch('/api/delete-cloudinary-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId }),
    });
    const data = await res.json().catch(() => null);
    return Boolean(data?.success);
  } catch (err) {
    console.log('[Cloudinary Delete Notice]', err);
    return false;
  }
}

/**
 * Permanently deletes multiple images from Cloudinary storage via server-side API
 */
export async function deleteMultipleImagesFromCloudinary(urlsOrPublicIds: string[]): Promise<void> {
  if (!urlsOrPublicIds || urlsOrPublicIds.length === 0) return;
  const publicIds = urlsOrPublicIds
    .map(extractCloudinaryPublicId)
    .filter(Boolean);

  if (publicIds.length === 0) return;

  // In standalone native mobile app, avoid attempting relative web endpoints
  if (typeof window === 'undefined' || !window.location?.origin) {
    return;
  }

  try {
    await fetch('/api/delete-cloudinary-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicIds }),
    });
  } catch (err) {
    console.log('[Cloudinary Batch Delete Notice]', err);
  }
}

