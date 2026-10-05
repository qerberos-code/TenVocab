import { VOCAB } from './vocab';
import DICTIONARY from '../data/lexicon.json';

// One entry a flashcard can be built from. Everything here ships inside the app,
// so lookups work with no connection at all.
export type Entry = {
  word: string;
  partOfSpeech: string;
  definition: string;      // the sense the SAT/ACT actually tests
  example: string;
  synonyms: string[];
  altDefinition?: string;  // second tested sense, when a word has one
  source: 'deck' | 'dictionary';
};

type DictRow = { w: string; p: string; d: string; e: string; s: string[]; a?: string };

const INDEX = new Map<string, Entry>();
// bundled dictionary first, then the authored deck overrides it (ours is richer)
for (const r of DICTIONARY as DictRow[]) {
  INDEX.set(r.w, { word: r.w, partOfSpeech: r.p, definition: r.d, example: r.e, synonyms: r.s, altDefinition: r.a, source: 'dictionary' });
}
for (const w of VOCAB) {
  INDEX.set(w.word.toLowerCase(), { word: w.word, partOfSpeech: w.partOfSpeech, definition: w.definition, example: w.example, synonyms: w.synonyms, altDefinition: w.altDefinition, source: 'deck' });
}

export const lexiconSize = () => INDEX.size;

/** Lower-case, strip anything that is not a letter, apostrophe or hyphen. */
export const normalize = (t: string) => t.toLowerCase().replace(/[^a-z'-]/g, '').replace(/^['-]+|['-]+$/g, '');

// Cheap stemming so "mitigated", "ambiguity's", "abates" all find their headword.
function* lemmas(t: string) {
  yield t;
  if (t.endsWith("'s")) yield t.slice(0, -2);
  if (t.endsWith('ies')) yield t.slice(0, -3) + 'y';
  if (t.endsWith('es')) yield t.slice(0, -2);
  if (t.endsWith('s')) yield t.slice(0, -1);
  if (t.endsWith('ed')) { yield t.slice(0, -2); yield t.slice(0, -1); yield t.slice(0, -3); }
  if (t.endsWith('ing')) { yield t.slice(0, -3); yield t.slice(0, -3) + 'e'; yield t.slice(0, -4); }
  if (t.endsWith('ly')) { yield t.slice(0, -2); yield t.slice(0, -3) + 'e'; }
  if (t.endsWith('ness')) yield t.slice(0, -4);
  if (t.endsWith('ity')) { yield t.slice(0, -3) + 'e'; yield t.slice(0, -3); yield t.slice(0, -3) + 'ous'; }
  if (t.endsWith('tion')) { yield t.slice(0, -3) + 'e'; yield t.slice(0, -4) + 'e'; }
  if (t.endsWith('er') || t.endsWith('or')) yield t.slice(0, -2);
}

/** Find the entry for a token, tolerating plurals, tenses and OCR punctuation. */
export function lookup(token: string): Entry | null {
  const t = normalize(token);
  if (t.length < 3) return null;
  for (const l of lemmas(t)) { const hit = INDEX.get(l); if (hit) return hit; }
  return null;
}

// Words that appear on vocabulary worksheets but are never the vocabulary.
const NOISE = new Set(['the','and','for','with','that','this','from','into','your','you','are','was','were','have','has','had','not','but','his','her','its','our','their','they','them','she','him','who','what','when','where','which','will','would','can','could','should','than','then','there','these','those','also','about','after','before','over','under','each','other','some','such','very','more','most','many','much','being','been','does','did','done',
  'word','words','list','vocabulary','vocab','definition','definitions','define','meaning','meanings','example','examples','sentence','sentences','synonym','synonyms','antonym','antonyms','noun','verb','adjective','adverb','adj','page','unit','lesson','chapter','week','test','quiz','name','date','class','period','english','grade','practice','study','review','section','part','number','answer','answers','question','questions']);

export type Candidate = { key: string; shown: string; entry: Entry | null };

/**
 * Turn recognized text lines into vocabulary candidates, in reading order.
 * Any token found in the dictionary counts. On a line with no dictionary hit, the
 * first real word is kept too, so words we do not know yet still become cards.
 */
export function extractCandidates(lines: string[]): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const push = (c: Candidate) => { if (!seen.has(c.key)) { seen.add(c.key); out.push(c); } };
  for (const raw of lines) {
    const tokens = raw.split(/[\s,;:/()\[\]{}|•·*"“”]+/).map(normalize).filter(Boolean);
    let hit = false;
    for (const tok of tokens) {
      if (tok.length < 3 || NOISE.has(tok)) continue;
      const e = lookup(tok);
      if (e) { hit = true; push({ key: e.word.toLowerCase(), shown: e.word, entry: e }); }
    }
    if (hit) continue;
    // Lines like "1. serendipity" or "serendipity - good luck": keep the leading word.
    // Prose lines (long, no number or bullet) are skipped so sentences do not become cards.
    const listLike = tokens.length <= 6 || /^\s*(\d+[.)]?|[-•*·])\s/.test(raw);
    const first = tokens[0];
    if (listLike && first && first.length >= 4 && /^[a-z][a-z'-]*$/.test(first) && !NOISE.has(first)) push({ key: first, shown: first, entry: null });
  }
  return out;
}
