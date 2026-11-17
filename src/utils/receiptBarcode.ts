/**
 * Pure TypeScript ISO/IEC 15417 Code 128B Barcode Generator
 * Zero external runtime dependencies; works offline in browser SVG, print, and Node unit tests.
 */

export interface BarcodeSvgRect {
  x: number;
  width: number;
}

export interface BarcodeSvgData {
  normalizedText: string;
  totalWidth: number;
  height: number;
  rects: BarcodeSvgRect[];
}

// Standard Code 128 symbol bar/space module widths (codes 0..106)
// Every symbol 0..105 sums to 11 modules; Stop symbol (106) sums to 13 modules.
const CODE128_PATTERNS: readonly (readonly number[])[] = [
  [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 2, 3], [1, 2, 1, 3, 2, 2],
  [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], [1, 3, 2, 2, 1, 2], [2, 2, 1, 2, 1, 3],
  [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2], [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1],
  [1, 1, 3, 2, 2, 2], [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1], [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2],
  [2, 2, 1, 2, 3, 1], [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1], [3, 1, 1, 2, 2, 2],
  [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1], [3, 1, 2, 2, 1, 2], [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1],
  [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], [2, 3, 2, 1, 2, 1], [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3],
  [1, 3, 1, 3, 2, 1], [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1], [2, 1, 1, 3, 1, 3],
  [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1], [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], [1, 3, 2, 1, 3, 1],
  [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1], [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1],
  [2, 3, 1, 1, 3, 1], [2, 1, 3, 1, 1, 3], [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1], [3, 1, 1, 1, 2, 3],
  [3, 1, 1, 3, 2, 1], [3, 3, 1, 1, 2, 1], [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1],
  [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1], [1, 1, 1, 2, 2, 4], [1, 1, 1, 4, 2, 2],
  [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], [1, 4, 1, 2, 2, 1], [1, 1, 2, 2, 1, 4],
  [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4], [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1],
  [2, 4, 1, 2, 1, 1], [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1],
  [1, 1, 1, 2, 4, 2], [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2], [1, 2, 4, 1, 1, 2],
  [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2], [4, 2, 1, 1, 1, 2], [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1],
  [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], [1, 1, 1, 1, 4, 3], [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1],
  [1, 1, 4, 1, 1, 3], [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1], [1, 1, 3, 1, 4, 1],
  [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], [2, 1, 1, 2, 1, 4],
  [2, 1, 1, 2, 3, 2], [2, 3, 3, 1, 1, 1, 2],
];

const START_CODE_B = 104;
const STOP_CODE = 106;
const QUIET_ZONE_MODULES = 10;

/**
 * Normalizes barcode content for Code 128B (printable ASCII 32..126).
 */
export function normalizeBarcodeText(text: string): string {
  const cleaned = String(text || '')
    .trim()
    .replace(/[^\x20-\x7E]/g, '');
  return cleaned || 'WARUNG';
}

/**
 * Encodes an input string into Code 128B binary modules (0 = space, 1 = bar)
 * including 10-module leading/trailing quiet zones.
 */
export function encodeCode128BModules(text: string): {
  normalizedText: string;
  modules: number[];
} {
  const normalizedText = normalizeBarcodeText(text);
  const symbolCodes: number[] = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < normalizedText.length; i++) {
    const code = normalizedText.charCodeAt(i) - 32;
    symbolCodes.push(code);
    checksum += code * (i + 1);
  }

  symbolCodes.push(checksum % 103);
  symbolCodes.push(STOP_CODE);

  const modules: number[] = new Array(QUIET_ZONE_MODULES).fill(0);
  symbolCodes.forEach((sym) => {
    const pattern = CODE128_PATTERNS[sym];
    pattern.forEach((runLength, idx) => {
      const bit = idx % 2 === 0 ? 1 : 0;
      for (let k = 0; k < runLength; k++) {
        modules.push(bit);
      }
    });
  });

  for (let q = 0; q < QUIET_ZONE_MODULES; q++) {
    modules.push(0);
  }

  return { normalizedText, modules };
}

/**
 * Converts Code 128B binary modules into merged SVG bar rectangles for sharp vector rendering.
 */
export function buildCode128SvgData(text: string, height: number = 42): BarcodeSvgData {
  const { normalizedText, modules } = encodeCode128BModules(text);
  const rects: BarcodeSvgRect[] = [];
  let runStart = -1;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === 1 && runStart === -1) {
      runStart = i;
    } else if (modules[i] === 0 && runStart !== -1) {
      rects.push({ x: runStart, width: i - runStart });
      runStart = -1;
    }
  }
  if (runStart !== -1) {
    rects.push({ x: runStart, width: modules.length - runStart });
  }

  return {
    normalizedText,
    totalWidth: modules.length,
    height,
    rects,
  };
}
