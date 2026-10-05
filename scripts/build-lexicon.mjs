// Merge the per-letter author files into data/lexicon.json and validate every row.
// Usage: node scripts/build-lexicon.mjs <dir-with-*.json>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/build-lexicon.mjs <dir>'); process.exit(1); }
const POS = new Set(['noun', 'verb', 'adjective', 'adverb', 'conjunction', 'preposition']);
const deck = new Set([...readFileSync('src/vocab.ts', 'utf8').matchAll(/^W\('[^']+','([^']+)'/gm)].map(m => m[1].toLowerCase()));

const rows = new Map();
const problems = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  let arr;
  try { arr = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch (e) { problems.push(`${f}: ${e.message}`); continue; }
  for (const r of arr) {
    const w = String(r.w ?? '').trim().toLowerCase();
    const where = `${f}:${w || '?'}`;
    if (!/^[a-z][a-z-]{1,}$/.test(w)) { problems.push(`${where} bad headword`); continue; }
    if (deck.has(w)) continue;                       // the authored deck wins; skip silently
    if (rows.has(w)) continue;                        // first author wins on duplicates
    if (!POS.has(r.p)) { problems.push(`${where} pos=${r.p}`); continue; }
    const d = String(r.d ?? '').trim(), e = String(r.e ?? '').trim();
    const dw = d.split(/\s+/).length, ew = e.split(/\s+/).length;
    if (dw < 3 || dw > 18) { problems.push(`${where} definition ${dw} words`); continue; }
    if (ew < 8 || ew > 28) { problems.push(`${where} example ${ew} words`); continue; }
    if (!Array.isArray(r.s) || r.s.length < 2 || r.s.length > 4) { problems.push(`${where} synonyms`); continue; }
    const row = { w, p: r.p, d, e, s: r.s.map(x => String(x).toLowerCase().trim()) };
    if (r.a && String(r.a).trim()) row.a = String(r.a).trim();
    rows.set(w, row);
  }
}
const out = [...rows.values()].sort((a, b) => a.w.localeCompare(b.w));
writeFileSync('data/lexicon.json', JSON.stringify(out));
const by = {}; for (const r of out) by[r.w[0]] = (by[r.w[0]] ?? 0) + 1;
console.log(`wrote data/lexicon.json: ${out.length} entries (${(JSON.stringify(out).length / 1024).toFixed(0)} KB)`);
console.log('per letter:', Object.entries(by).map(([k, v]) => `${k}${v}`).join(' '));
if (problems.length) { console.log(`\n${problems.length} rows skipped:`); for (const p of problems.slice(0, 40)) console.log('  ' + p); if (problems.length > 40) console.log(`  …and ${problems.length - 40} more`); }
