/**
 * Image compression utilities for Bluesky and other platforms
 */

interface CompressionOptions {
  maxSizeBytes: number;
  maxDimensions: { width: number; height: number };
  initialQuality: number;
  qualityStep: number;
  minQuality: number;
}

const BLUESKY_LIMITS: CompressionOptions = {
  maxSizeBytes: 1000000, // 1MB
  maxDimensions: { width: 2000, height: 2000 },
  initialQuality: 0.9,
  qualityStep: 0.1,
  minQuality: 0.1,
};

/**
 * Compress an image file to meet Bluesky's requirements
 */
export const compressImageForBluesky = async (file: File): Promise<File> => {
  return compressImage(file, BLUESKY_LIMITS);
};

/**
 * Compress an image file to meet specified requirements
 */
export const compressImage = async (file: File, options: CompressionOptions): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        const { width: maxWidth, height: maxHeight } = options.maxDimensions;
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const aspectRatio = width / height;
          if (width > height) {
            width = maxWidth;
            height = width / aspectRatio;
          } else {
            height = maxHeight;
            width = height * aspectRatio;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels until we meet size requirements
        let quality = options.initialQuality;
        
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            console.log(`Compressed image: ${blob.size} bytes (${(blob.size / 1024 / 1024).toFixed(2)}MB) at quality ${quality}`);

            if (blob.size <= options.maxSizeBytes || quality <= options.minQuality) {
              // Success or reached minimum quality
              const compressedFile = new File([blob], file.name, {
                type: blob.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // Try lower quality
              quality -= options.qualityStep;
              tryCompress();
            }
          }, 'image/jpeg', quality);
        };

        tryCompress();
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Check if an image needs compression for Bluesky
 */
export const needsCompressionForBluesky = (file: File): boolean => {
  return file.size > BLUESKY_LIMITS.maxSizeBytes;
};

/**
 * Get compression info for display to user
 */
export const getCompressionInfo = (originalSize: number, compressedSize: number) => {
  const originalMB = (originalSize / 1024 / 1024).toFixed(2);
  const compressedMB = (compressedSize / 1024 / 1024).toFixed(2);
  const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
  
  return {
    originalMB,
    compressedMB,
    compressionRatio,
    message: `Compressed from ${originalMB}MB to ${compressedMB}MB (${compressionRatio}% reduction)`
  };
};