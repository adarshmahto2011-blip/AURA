/**
 * Aura Music — Canvas-based Dominant Color Extractor
 * Samples an image URL via an offscreen canvas to find the
 * dominant hue, then returns a dark-adapted gradient pair
 * suitable for the Now Playing adaptive background.
 */

const cache = new Map();

/**
 * Extract dominant color palette from an image URL.
 * Returns { r, g, b, hex, darkBg, midColor } or null on failure.
 */
export async function extractColors(imageUrl) {
  if (cache.has(imageUrl)) return cache.get(imageUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const SIZE = 64; // sample at small size for speed
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SIZE, SIZE);

        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
        const result = _dominantColor(data);
        cache.set(imageUrl, result);
        resolve(result);
      } catch(e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
}

function _dominantColor(data) {
  // Bucket pixels into hue buckets, ignore near-grey and near-black
  const buckets = new Array(36).fill(0);  // 10° buckets
  let totalR = 0, totalG = 0, totalB = 0, count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const [h, s, l] = rgbToHsl(r, g, b);

    // Skip near-black, near-white, and desaturated pixels
    if (l < 0.08 || l > 0.92 || s < 0.12) continue;

    const bucketIdx = Math.floor(h / 10);
    buckets[bucketIdx] += s * (1 - Math.abs(l - 0.5) * 2); // weight by saturation + mid-lightness
    totalR += r; totalG += g; totalB += b; count++;
  }

  // Find the dominant hue bucket
  let maxBucket = 0, maxVal = 0;
  buckets.forEach((v, i) => { if (v > maxVal) { maxVal = v; maxBucket = i; } });

  const dominantHue = maxBucket * 10;

  // Fallback to average color if no clear dominant hue
  if (count === 0 || maxVal === 0) {
    return _fallback(totalR, totalG, totalB, count);
  }

  // Build dark background and mid accent from the dominant hue
  const darkBg  = `hsl(${dominantHue}, 30%, 8%)`;
  const midColor = `hsl(${dominantHue}, 50%, 22%)`;

  // Also derive average for the image-based blur tint
  const avgR = count ? Math.round(totalR / count) : 30;
  const avgG = count ? Math.round(totalG / count) : 30;
  const avgB = count ? Math.round(totalB / count) : 30;

  return { r: avgR, g: avgG, b: avgB, dominantHue, darkBg, midColor };
}

function _fallback(totalR, totalG, totalB, count) {
  const r = count ? Math.round(totalR / count) : 20;
  const g = count ? Math.round(totalG / count) : 20;
  const b = count ? Math.round(totalB / count) : 20;
  return { r, g, b, dominantHue: 0, darkBg: '#0e0e0e', midColor: '#1a1a1a' };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}
