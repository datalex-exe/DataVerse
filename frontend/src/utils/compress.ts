/**
 * Fast client-side image compression utility.
 * - Decodes asynchronously off the main thread using createImageBitmap (falling back to object URLs).
 * - Avoids Base64 / FileReader string conversions that cause memory spikes and main-thread freezes.
 * - Skips redundant compression for files that are already small (<= 800KB).
 * - Preserves GIF animations.
 * - Handles EXIF orientation tags automatically.
 */
export async function compressImage(
  file: Blob | File,
  maxDimension: number = 1440,
  quality: number = 0.82
): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Never re-encode animated GIFs
  if (file.type === 'image/gif') {
    return file;
  }

  // Fast-path: If image is already reasonably small (<= 800KB) and is JPEG or WebP, skip re-compression
  if (file.size <= 800 * 1024 && (file.type === 'image/jpeg' || file.type === 'image/webp')) {
    return file;
  }

  // 1. Try modern off-thread decoding with createImageBitmap
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      let { width, height } = bitmap;

      // Check if resizing is necessary
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close(); // Free bitmap GPU memory immediately

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', quality);
        });

        if (blob) {
          // If compressed blob is somehow larger than original, return original
          return blob.size < file.size ? blob : file;
        }
      }
    } catch (bitmapErr) {
      console.warn('createImageBitmap failed, falling back to Image element:', bitmapErr);
    }
  }

  // 2. Fallback using URL.createObjectURL (no Base64 FileReader overhead)
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve(file);
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Fallback to original file on decode error
    };

    img.src = objectUrl;
  });
}
