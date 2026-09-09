/**
 * Formats byte counts into human-readable sizes.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Calculates simplified aspect ratio string from dimensions.
 */
export function getAspectRatio(width: number, height: number): string {
  if (!width || !height) return '1:1';

  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }

  const divisor = gcd(width, height);
  const rw = width / divisor;
  const rh = height / divisor;

  // If the ratio numbers are small and clean
  if (rw <= 21 && rh <= 21) {
    return `${rw}:${rh}`;
  }

  // Otherwise check closest common photographic/display ratios
  const ratio = width / height;
  const common = [
    { label: '1:1', val: 1 },
    { label: '4:3', val: 4 / 3 },
    { label: '3:2', val: 3 / 2 },
    { label: '16:9', val: 16 / 9 },
    { label: '16:10', val: 16 / 10 },
    { label: '21:9', val: 21 / 9 },
    { label: '9:16', val: 9 / 16 },
    { label: '3:4', val: 3 / 4 },
    { label: '2:3', val: 2 / 3 },
  ];

  let closest = common[0];
  let minDiff = Math.abs(ratio - closest.val);

  for (const item of common) {
    const diff = Math.abs(ratio - item.val);
    if (diff < minDiff) {
      minDiff = diff;
      closest = item;
    }
  }

  if (minDiff < 0.05) {
    return closest.label;
  }

  return `${ratio.toFixed(2)}:1`;
}

/**
 * Extracts a palette of prominent colors using canvas pixel sampling.
 */
export function extractImageColors(
  img: HTMLImageElement,
  count: number = 5
): string[] {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];

    // Scale down for fast sampling
    const sampleSize = 64;
    canvas.width = sampleSize;
    canvas.height = sampleSize;

    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

    const colorBins: { [key: string]: { r: number; g: number; b: number; count: number } } = {};

    // Sample pixels with stride to balance performance and quality
    for (let i = 0; i < imageData.length; i += 16) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];

      // Ignore transparent pixels or extreme near-blacks/near-whites for palette variation
      if (a < 128) continue;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 15 || brightness > 245) continue;

      // Quantize to groups of 32
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;

      if (!colorBins[key]) {
        colorBins[key] = { r: qr, g: qg, b: qb, count: 0 };
      }
      colorBins[key].count++;
    }

    const sortedBins = Object.values(colorBins).sort((a, b) => b.count - a.count);
    const results: string[] = [];

    for (const bin of sortedBins.slice(0, count)) {
      const hex = `#${((1 << 24) + (bin.r << 16) + (bin.g << 8) + bin.b)
        .toString(16)
        .slice(1)}`;
      results.push(hex);
    }

    // If too few colors found (e.g. pure monochrome), fallback
    if (results.length === 0) {
      return ['#4A5568', '#718096', '#CBD5E0'];
    }

    return results;
  } catch {
    // Cross-origin image might taint canvas
    return ['#52525B', '#A1A1AA', '#E4E4E7'];
  }
}

/**
 * Loads an image from URL or File and resolves dimensions, ratio, and palette.
 */
export function analyzeImage(
  src: string
): Promise<{ width: number; height: number; aspectRatio: string; palette: string[] }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const aspectRatio = getAspectRatio(width, height);
      const palette = extractImageColors(img, 4);

      resolve({
        width,
        height,
        aspectRatio,
        palette,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image. Check the URL or file format.'));
    };

    img.src = src;
  });
}
