import { Word } from './vocab';

export type ItemForm = 'context' | 'wordToDef' | 'defToWord' | 'cloze' | 'synonym';
export type Item = { form: ItemForm; prompt: string; label: string; choices: string[]; answer: string; explanation: string };

// deterministic PRNG so a given (word, encounter) always renders the same item
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = <T,>(a: T[], rand: () => number) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

// a distractor must not be a near-synonym of the target, or the item has two right answers
const confusable = (a: Word, b: Word) => {
  const syn = (w: Word) => new Set([w.word, ...w.synonyms.map(s => s.toLowerCase())]);
  const sa = syn(a), sb = syn(b);
  for (const t of sa) if (sb.has(t)) return true;
  return false;
};

const pool = (w: Word, all: Word[]) => all.filter(o => o.id !== w.id && !confusable(w, o));
const pick = <T,>(arr: T[], n: number, rand: () => number) => shuffle(arr, rand).slice(0, n);

// blank out the headword in its own example sentence, tolerating inflections
const clozeFrom = (w: Word): string | null => {
  const stem = w.word.replace(/(ate|ise|ize|e)$/i, '');
  if (stem.length < 4) return null;
  const re = new RegExp(`\\b${stem}\\w*\\b`, 'i');
  return re.test(w.example) ? w.example.replace(re, '_____') : null;
};

const FORMS: ItemForm[] = ['context', 'wordToDef', 'cloze', 'defToWord', 'synonym'];

export function buildItem(w: Word, all: Word[], encounter: number): Item {
  const rand = rng(hash(w.id + ':' + encounter));
  const others = pool(w, all);
  const order = FORMS.slice(encounter % FORMS.length).concat(FORMS.slice(0, encounter % FORMS.length));

  for (const form of order) {
    if (form === 'context') {
      return { form, label: 'Words in Context', prompt: w.question, choices: shuffle(w.choices, rand), answer: w.answer, explanation: w.explanation };
    }
    if (form === 'wordToDef') {
      const d = pick(others, 3, rand).map(o => o.definition);
      if (d.length < 3) continue;
      return { form, label: 'Meaning', prompt: `What does "${w.word}" mean?`, choices: shuffle([w.definition, ...d], rand), answer: w.definition, explanation: `${w.word} means ${w.definition}.` };
    }
    if (form === 'defToWord') {
      const d = pick(others, 3, rand).map(o => o.word);
      if (d.length < 3) continue;
      return { form, label: 'Recall', prompt: `Which word means "${w.definition}"?`, choices: shuffle([w.word, ...d], rand), answer: w.word, explanation: `${w.word} means ${w.definition}.` };
    }
    if (form === 'cloze') {
      const sentence = clozeFrom(w);
      const d = pick(others, 3, rand).map(o => o.word);
      if (!sentence || d.length < 3) continue;
      return { form, label: 'Words in Context', prompt: sentence, choices: shuffle([w.word, ...d], rand), answer: w.word, explanation: `${w.word} means ${w.definition}.` };
    }
    if (form === 'synonym') {
      const correct = w.synonyms[Math.floor(rand() * w.synonyms.length)];
      const d = pick(others, 3, rand).map(o => o.synonyms[0]).filter(Boolean);
      if (!correct || d.length < 3) continue;
      return { form, label: 'Nuance', prompt: `Which is closest in meaning to "${w.word}"?`, choices: shuffle([correct, ...d], rand), answer: correct, explanation: `${w.word} means ${w.definition}, so ${correct} is closest.` };
    }
  }
  return { form: 'context', label: 'Words in Context', prompt: w.question, choices: w.choices, answer: w.answer, explanation: w.explanation };
}
