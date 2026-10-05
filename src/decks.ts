import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Candidate } from './lexicon';

export type Card = {
  id: string;
  word: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  synonyms: string[];
  altDefinition?: string;
  source: 'deck' | 'dictionary' | 'custom';
  known: boolean;          // last answer in the flashcard viewer
};
export type Deck = { id: string; name: string; createdAt: string; cards: Card[] };

const KEY = 'vocabsat-decks-v1';   // decks live only on this device
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export async function loadDecks(): Promise<Deck[]> {
  try { const raw = await AsyncStorage.getItem(KEY); return raw ? JSON.parse(raw) as Deck[] : []; } catch { return []; }
}
const save = (d: Deck[]) => AsyncStorage.setItem(KEY, JSON.stringify(d));

export function cardFrom(c: Candidate): Card {
  if (c.entry) return { id: uid(), word: c.entry.word, partOfSpeech: c.entry.partOfSpeech, definition: c.entry.definition, example: c.entry.example, synonyms: c.entry.synonyms, altDefinition: c.entry.altDefinition, source: c.entry.source, known: false };
  return { id: uid(), word: c.shown, partOfSpeech: '', definition: '', example: '', synonyms: [], source: 'custom', known: false };
}

export async function createDeck(name: string, cards: Card[]): Promise<Deck> {
  const deck: Deck = { id: uid(), name: name.trim() || defaultName(), createdAt: new Date().toISOString(), cards };
  const all = await loadDecks();
  await save([deck, ...all]);
  return deck;
}
export async function updateDeck(deck: Deck) { const all = await loadDecks(); await save(all.map(d => d.id === deck.id ? deck : d)); }
export async function deleteDeck(id: string) { const all = await loadDecks(); await save(all.filter(d => d.id !== id)); }

export const defaultName = () => { const d = new Date(); return `Scanned ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`; };
