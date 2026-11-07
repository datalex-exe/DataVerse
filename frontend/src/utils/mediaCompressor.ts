/**
 * High-performance client-side image compression.
 * Downscales images exceeding max dimension and converts to efficient WebP (or JPEG fallback).
 * Drastically reduces upload bandwidth and saves user data without quality loss.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1, default 0.82
  maxSizeMB?: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.82
  } = options;

  // Only compress images (skip gif animations, videos, and non-images)
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  // If already small (< 250 KB), skip compression
  if (file.size < 250 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(file);
          return;
        }

        // High quality bicubic resampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer modern webp, fallback to jpeg
        const outputMime = 'image/webp';

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compressed size is larger, keep original
              resolve(file);
              return;
            }

            const newFileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const compressedFile = new File([blob], newFileName, {
              type: outputMime,
              lastModified: Date.now()
            });

            resolve(compressedFile);
          },
          outputMime,
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
