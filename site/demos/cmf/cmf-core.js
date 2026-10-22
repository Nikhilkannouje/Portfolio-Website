// Pure image-processing helpers for the CMF Variant Generator (v0).
// Works on RGBA pixel arrays so it runs in the browser and in Node tests.

const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Select the contiguous region around (x, y) whose colour is within `tolerance`
 * (Euclidean RGB distance) of the seed pixel. Returns a Uint8Array mask (1 = selected).
 */
export function floodFillMask(data, width, height, x, y, tolerance = 40) {
  const mask = new Uint8Array(width * height);
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return mask;
  const s = (y * width + x) * 4;
  const sr = data[s], sg = data[s + 1], sb = data[s + 2];
  const tol2 = tolerance * tolerance;
  const stack = [y * width + x];
  mask[y * width + x] = 1;
  while (stack.length) {
    const p = stack.pop();
    const px = p % width, py = (p - px) / width;
    const neighbours = [
      px > 0 ? p - 1 : -1,
      px < width - 1 ? p + 1 : -1,
      py > 0 ? p - width : -1,
      py < height - 1 ? p + width : -1,
    ];
    for (const n of neighbours) {
      if (n < 0 || mask[n]) continue;
      const i = n * 4;
      const dr = data[i] - sr, dg = data[i + 1] - sg, db = data[i + 2] - sb;
      if (dr * dr + dg * dg + db * db <= tol2) {
        mask[n] = 1;
        stack.push(n);
      }
    }
  }
  return mask;
}

/** Union of two masks (for shift-click "add to selection"). */
export function unionMask(a, b) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] || b[i] ? 1 : 0;
  return out;
}

export function countMask(mask) {
  let n = 0;
  for (let i = 0; i < mask.length; i++) n += mask[i];
  return n;
}

// Finish models: `contrast` scales how strongly original shading shows through,
// `specular` adds white highlights on bright areas, `sat` adjusts colour saturation.
export const FINISHES = {
  matte:    { label: "Matte",    contrast: 0.6, specular: 0.0, sat: 0.9 },
  satin:    { label: "Satin",    contrast: 0.9, specular: 0.25, sat: 1.0 },
  gloss:    { label: "Gloss",    contrast: 1.0, specular: 0.7, sat: 1.05 },
  metallic: { label: "Metallic", contrast: 1.4, specular: 0.5, sat: 0.8 },
};

export function hexToRgb(hex) {
  const v = hex.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((c) => c + c).join("") : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Recolour only the masked pixels with `rgb`, keeping the original shading.
 * Pixels outside the mask are copied unchanged.
 */
export function applyFinish(src, mask, rgb, finishKey = "satin") {
  const f = FINISHES[finishKey] || FINISHES.satin;
  const out = new Uint8ClampedArray(src);
  // Mean luminance of the region, so shading is expressed relative to it.
  let sum = 0, n = 0, max = 0;
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    const l = lum(src[i], src[i + 1], src[i + 2]);
    sum += l; n++; if (l > max) max = l;
  }
  if (!n) return out;
  const mean = Math.max(sum / n, 1);
  const hiStart = mean + (max - mean) * 0.5;
  const tl = lum(rgb[0], rgb[1], rgb[2]);

  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    const l = lum(src[i], src[i + 1], src[i + 2]);
    const shade = Math.pow(l / mean, f.contrast);
    const spec = max > hiStart ? Math.max(0, (l - hiStart) / (max - hiStart + 1)) * f.specular * 255 : 0;
    for (let c = 0; c < 3; c++) {
      const sat = tl + (rgb[c] - tl) * f.sat;
      out[i + c] = sat * shade + spec;
    }
  }
  return out;
}
