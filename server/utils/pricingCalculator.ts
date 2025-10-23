import priceBreakMapThin from './priceBreakMap_Thin.json';
import priceBreakMapThick from './priceBreakMap_Thick.json';

interface PriceBreakMap {
  [length: string]: {
    [width: string]: number;
  };
}

const priceMapCache = {
  thin: priceBreakMapThin as PriceBreakMap,
  thick: priceBreakMapThick as PriceBreakMap,
};

interface PricingLookupParams {
  width: number;
  length: number;
  thickness: 'thin' | 'thick';
  widthKeyOffset?: number;
  mode?: 'floor' | 'ceil' | 'nearest';
}

interface PricingResult {
  widthRequested: number;
  lengthRequested: number;
  widthUsed: number;
  lengthUsed: number;
  pricePerSqFt: number;
  area: number;
  total: number;
}

function findFloorKey(sortedKeys: number[], target: number): number | null {
  let floor = null;
  for (const k of sortedKeys) {
    if (k <= target) floor = k;
    else break;
  }
  return floor;
}

function normalizeMap(rawMap: PriceBreakMap): {
  map: { [key: number]: { [key: number]: number } };
  headers: number[];
} {
  const normalized: { [key: number]: { [key: number]: number } } = {};
  const headerSet = new Set<number>();

  for (const [lenK, inner] of Object.entries(rawMap)) {
    const lenN = Number(lenK);
    const innerNorm: { [key: number]: number } = {};
    for (const [wK, price] of Object.entries(inner)) {
      const wN = Number(wK);
      innerNorm[wN] = Number(price);
      headerSet.add(wN);
    }
    normalized[lenN] = innerNorm;
  }

  const headers = Array.from(headerSet).sort((a, b) => a - b);
  return { map: normalized, headers };
}

/**
 * Calculate price for custom rug pad dimensions
 * Based on Google Sheets pricing matrices
 */
export function lookupPrice(params: PricingLookupParams): PricingResult {
  const {
    width: W,
    length: L,
    thickness = 'thin',
    widthKeyOffset = 0,
    mode = 'floor',
  } = params;

  if (W == null || L == null) {
    throw new Error('Width and length are required');
  }

  const rawMap = thickness === 'thin' ? priceMapCache.thin : priceMapCache.thick;
  const { map, headers } = normalizeMap(rawMap);

  // Find the length key: greatest length <= L
  const lengthKeys = Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b);
  const lenKey = findFloorKey(lengthKeys, Number(L));

  if (lenKey == null) {
    throw new Error(`No length breakpoint <= ${L}`);
  }

  const widthsObj = map[lenKey];

  // Choose header based on mode
  let headerKey: number;
  const targetW = Number(W);

  if (mode === 'ceil') {
    headerKey = headers.find((h) => h >= targetW) ?? headers[headers.length - 1];
  } else if (mode === 'nearest') {
    let best = headers[0];
    let bestDiff = Math.abs(best - targetW);
    for (const h of headers) {
      const d = Math.abs(h - targetW);
      if (d < bestDiff) {
        best = h;
        bestDiff = d;
      }
    }
    headerKey = best;
  } else {
    // default floor
    headerKey = findFloorKey(headers, targetW) ?? headers[0];
  }

  // Apply optional offset
  if (widthKeyOffset) {
    headerKey = headerKey + Number(widthKeyOffset);
  }

  // Determine price
  const widthKeys = Object.keys(widthsObj)
    .map(Number)
    .sort((a, b) => a - b);
  const priceKey =
    Object.prototype.hasOwnProperty.call(widthsObj, headerKey)
      ? headerKey
      : findFloorKey(widthKeys, headerKey);

  if (priceKey == null) {
    throw new Error(
      `No width breakpoint available to price ${W} for length ${lenKey}`
    );
  }

  const pricePerSqFt = widthsObj[priceKey];
  const area = Number(W) * Number(L);
  const total = area * pricePerSqFt;

  return {
    widthRequested: Number(W),
    lengthRequested: Number(L),
    widthUsed: headerKey,
    lengthUsed: lenKey,
    pricePerSqFt,
    area,
    total,
  };
}

/**
 * Calculate price with quantity
 */
export function calculateQuote(
  width: number,
  length: number,
  thickness: 'thin' | 'thick',
  quantity: number = 1
): PricingResult & { quantity: number; grandTotal: number } {
  const result = lookupPrice({ width, length, thickness });
  
  return {
    ...result,
    quantity,
    grandTotal: result.total * quantity,
  };
}

/**
 * Validate dimensions are within acceptable range (2-40 feet)
 */
export function validateDimensions(width: number, length: number): {
  valid: boolean;
  error?: string;
} {
  if (width < 2 || width > 40) {
    return { valid: false, error: 'Width must be between 2 and 40 feet' };
  }
  if (length < 2 || length > 40) {
    return { valid: false, error: 'Length must be between 2 and 40 feet' };
  }
  return { valid: true };
}
