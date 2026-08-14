/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Resizes the image so that the maximum dimension does not exceed maxDimension (e.g. 1080px).
 * Compresses it to high-quality JPEG to stay within storage caps.
 * 
 * @param file The input file
 * @param maxDimension The maximum width or height of the output image (default 1080)
 * @param quality The output image quality from 0 to 1 (default 0.8)
 */
export function compressImage(file: File, maxDimension: number = 1080, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image'));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize keeping aspect ratio
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to get 2D context from canvas'));
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as compressed JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image source'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file buffer'));
    reader.readAsDataURL(file);
  });
}
