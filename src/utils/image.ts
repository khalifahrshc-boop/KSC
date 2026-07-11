/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resizes a base64 image string to fit within maxWidth and maxHeight while maintaining aspect ratio.
 * Uses WebP compression if supported, otherwise fallbacks to JPEG.
 */
export const resizeImage = (
  base64Str: string, 
  maxWidth: number = 300, 
  maxHeight: number = 300,
  quality: number = 0.6
): Promise<string> => {
  return new Promise((resolve) => {
    // If not a data URL, return as is
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }

    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Use a clean background for transparency-supporting formats or just white
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Prefer WebP for better compression
        const dataUrl = canvas.toDataURL('image/webp', quality);
        
        // If webp resulted in a larger file (rare) or failed, could fallback, 
        // but typically webp is much better.
        resolve(dataUrl);
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};
