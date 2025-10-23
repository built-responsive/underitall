import fs from 'fs/promises';
import path from 'path';

const MAP_FILES = {
  thin: 'priceBreakMap_Thin.json',
  thick: 'priceBreakMap_Thick.json',
};

let cache = {};

async function loadMap(thickness = 'thin') {
  const key = thickness.toLowerCase();
  if (cache[key]) return cache[key];
  const fileName = MAP_FILES[key];
  if (!fileName) throw new Error(`Unknown thickness: ${thickness}`);
  const absolute = path.join(process.cwd(), 'scripts', fileName);
  const raw = await fs.readFile(absolute, 'utf8');
  const parsed = JSON.parse(raw);
  // convert keys to numbers and inner keys to numbers for easier comparison
  const normalized = {};
  const headerSet = new Set();
  for (const [lenK, inner] of Object.entries(parsed)) {
    const lenN = Number(lenK);
    const innerNorm = {};
    for (const [wK, price] of Object.entries(inner)) {
      const wN = Number(wK);
      innerNorm[wN] = Number(price);
      headerSet.add(wN);
    }
    normalized[lenN] = innerNorm;
  }
  const headers = Array.from(headerSet).sort((a,b)=>a-b);
  cache[key] = { map: normalized, headers };
  return cache[key];
}

function findFloorKey(sortedKeys, target) {
  // assume sortedKeys is ascending
  let floor = null;
  for (const k of sortedKeys) {
    if (k <= target) floor = k;
    else break;
  }
  return floor;
}

/**
 * Lookup price per sqft and compute total.
 * W and L can be numbers (decimals allowed). Thickness is 'thin' or 'thick'.
 * Returns { widthUsed, lengthUsed, pricePerSqFt, area, total }
 */
export async function lookupPrice({ W, L, thickness = 'thin', widthKeyOffset = 0, mode = 'floor' }) {
  if (W == null || L == null) throw new Error('W and L are required');
  const { map, headers } = await loadMap(thickness);

  // find the length key to use: the greatest length <= L
  const lengthKeys = Object.keys(map).map(Number).sort((a,b)=>a-b);
  const lenKey = findFloorKey(lengthKeys, Number(L));
  if (lenKey == null) throw new Error(`No length breakpoint <= ${L}`);

  const widthsObj = map[lenKey];

  // Choose header (global) based on mode
  let headerKey;
  const targetW = Number(W);
  if (mode === 'ceil') {
    headerKey = headers.find(h => h >= targetW) ?? headers[headers.length - 1];
  } else if (mode === 'nearest') {
    // find nearest header
    let best = headers[0];
    let bestDiff = Math.abs(best - targetW);
    for (const h of headers) {
      const d = Math.abs(h - targetW);
      if (d < bestDiff) { best = h; bestDiff = d; }
    }
    headerKey = best;
  } else {
    // default floor
    headerKey = findFloorKey(headers, targetW);
    if (headerKey == null) headerKey = headers[0];
  }

  // Apply optional offset to headerKey (if needed for special sheet alignment)
  if (widthKeyOffset) headerKey = headerKey + Number(widthKeyOffset);

  // Determine price: if chosen header exists in this length row, use it.
  // Otherwise use the floor key within the length row to find the applicable price.
  const widthKeys = Object.keys(widthsObj).map(Number).sort((a,b)=>a-b);
  let priceKey = Object.prototype.hasOwnProperty.call(widthsObj, headerKey) ? headerKey : findFloorKey(widthKeys, headerKey);
  if (priceKey == null) throw new Error(`No width breakpoint available to price ${W} for length ${lenKey}`);

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

export default lookupPrice;
