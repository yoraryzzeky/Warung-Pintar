/**
 * Client-side automatic image resizing & compression for Warung Pintar Pro.
 * Reduces base64 payload size for product photos, store avatars, and QRIS images
 * before saving to IndexedDB / LocalStorage.
 */

export type ImageCompressionPreset = 'product' | 'avatar' | 'qris';

interface PresetConfig {
  maxDimension: number;
  quality: number;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export const COMPRESSION_PRESETS: Record<ImageCompressionPreset, PresetConfig> = {
  product: {
    maxDimension: 480,
    quality: 0.78,
    mimeType: 'image/jpeg',
  },
  avatar: {
    maxDimension: 360,
    quality: 0.8,
    mimeType: 'image/jpeg',
  },
  qris: {
    maxDimension: 720,
    quality: 0.92,
    mimeType: 'image/jpeg',
  },
};

/**
 * Computes aspect-preserving target dimensions bounded by maxDimension.
 */
export function getScaledDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  const safeW = Math.max(1, Math.round(Number(width) || 1));
  const safeH = Math.max(1, Math.round(Number(height) || 1));
  const safeMax = Math.max(1, Math.round(Number(maxDimension) || 1));

  if (safeW <= safeMax && safeH <= safeMax) {
    return { width: safeW, height: safeH };
  }

  const ratio = safeW >= safeH ? safeMax / safeW : safeMax / safeH;
  return {
    width: Math.max(1, Math.round(safeW * ratio)),
    height: Math.max(1, Math.round(safeH * ratio)),
  };
}

/**
 * Compresses a base64 / data URL image using an offscreen HTMLCanvasElement.
 * Falls back gracefully to the original dataUrl when Canvas is unavailable.
 */
export async function compressDataUrl(
  dataUrl: string,
  preset: ImageCompressionPreset = 'product'
): Promise<string> {
  if (!dataUrl || typeof document === 'undefined' || typeof Image === 'undefined') {
    return dataUrl;
  }

  // Skip external HTTP URLs (only compress data: URLs)
  if (!dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  const config = COMPRESSION_PRESETS[preset] || COMPRESSION_PRESETS.product;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const target = getScaledDimensions(img.naturalWidth || img.width, img.naturalHeight || img.height, config.maxDimension);
        const canvas = document.createElement('canvas');
        canvas.width = target.width;
        canvas.height = target.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        // White background preserves legibility for transparent PNGs & QRIS codes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, target.width, target.height);
        ctx.drawImage(img, 0, 0, target.width, target.height);
        const compressed = canvas.toDataURL(config.mimeType, config.quality);
        if (compressed && compressed.length < dataUrl.length) {
          resolve(compressed);
        } else if (compressed && target.width < (img.naturalWidth || img.width)) {
          resolve(compressed);
        } else {
          resolve(compressed || dataUrl);
        }
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Reads a File object and compresses it according to the chosen preset.
 */
export async function compressImageFile(
  file: File,
  preset: ImageCompressionPreset = 'product'
): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  if (!rawDataUrl) return '';
  return compressDataUrl(rawDataUrl, preset);
}
