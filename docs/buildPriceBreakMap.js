import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvURL_Thin = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSdjr_ZWgEOAfDH0c9bAxhRe-fDuc_Z9DAdCW3b4pSUgGjWtOhaVXUW7lWxlBN7eN9F_Z0M-I5X2N85/pub?gid=71970597&single=true&output=csv';
const csvURL_Thick = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSdjr_ZWgEOAfDH0c9bAxhRe-fDuc_Z9DAdCW3b4pSUgGjWtOhaVXUW7lWxlBN7eN9F_Z0M-I5X2N85/pub?gid=218236355&single=true&output=csv';

async function ensureFetch() {
  if (globalThis.fetch) return globalThis.fetch;
  try {
    // dynamic import of node-fetch (v3 is ESM)
    const mod = await import('node-fetch');
    return mod.default || mod;
  } catch (e) {
    return null;
  }
}

async function buildPriceBreakMap(csvUrl) {
  const fetchFn = await ensureFetch();
  if (!fetchFn) throw new Error('fetch is not available; please run `npm install node-fetch` or use Node 18+');

  const res = await fetchFn(csvUrl);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
  const text = await res.text();

  // Parse CSV into a 2D array (simple split, assumes no quoted commas)
  const rows = text.trim().split('\n').map(r => r.split(','));
  const widths = rows[0].slice(1).map(Number); // columns 2–40
  const lengths = rows.slice(1).map(r => Number(r[0])); // rows 2–40

  const map = {};

  for (let i = 1; i < rows.length; i++) {
    const length = lengths[i - 1];
    const row = rows[i].slice(1).map(Number);
    const inner = {};
    let prevPrice = null;

    for (let j = 0; j < row.length; j++) {
      const width = widths[j];
      const price = row[j];
      if (price !== prevPrice) {
        inner[width] = price;
        prevPrice = price;
      }
    }

    map[length] = inner;
  }

  return map;
}

async function main() {
  try {
    const map = await buildPriceBreakMap(csvURL_Thin);
    const outPath = path.join(__dirname, 'priceBreakMap_Thin.json');
    fs.writeFileSync(outPath, JSON.stringify(map, null, 2), 'utf8');
    console.log('Price break map thin written to', outPath);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  try {
    const map = await buildPriceBreakMap(csvURL_Thick);
    const outPath = path.join(__dirname, 'priceBreakMap_Thick.json');
    fs.writeFileSync(outPath, JSON.stringify(map, null, 2), 'utf8');
    console.log('Price break map thick written to', outPath);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

// run
main();
