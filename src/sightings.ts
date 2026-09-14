import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// A sighting is only (word, date). Nothing identifies the sender - by design.
export type SightingStat = { reports: number; lastSeen: string; distinctDates: number };
export type Stats = Record<string, SightingStat>;

const CACHE = 'vocabsat-sightings-stats-v1';   // last stats fetched, for offline display
const MINE  = 'vocabsat-sightings-mine-v1';    // wordId -> date this device reported (local only)
const QUEUE = 'vocabsat-sightings-queue-v1';   // reports that failed to send, retried later

const read = async <T,>(k: string, fallback: T): Promise<T> => {
  try { const raw = await AsyncStorage.getItem(k); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
};
const write = (k: string, v: unknown) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

export const today = () => new Date().toISOString().slice(0, 10);
export const isPlausibleDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= '2024-03-01' && d <= today();

/** Aggregates for every word anyone has reported. Falls back to the last cached copy offline. */
export async function fetchStats(): Promise<Stats> {
  const cached = await read<Stats>(CACHE, {});
  if (!supabase) return cached;
  const { data, error } = await supabase.from('sighting_stats').select('word_id,reports,last_seen,distinct_dates');
  if (error || !data) return cached;
  const stats: Stats = {};
  for (const r of data as { word_id: string; reports: number; last_seen: string; distinct_dates: number }[]) {
    stats[r.word_id] = { reports: r.reports, lastSeen: r.last_seen, distinctDates: r.distinct_dates };
  }
  await write(CACHE, stats);
  return stats;
}

/** Words this device has already reported, so the UI can show "you reported this on ...". */
export const myReports = () => read<Record<string, string>>(MINE, {});

/** Record a sighting. Remembered locally at once; sent now if possible, otherwise queued. */
export async function report(wordId: string, seenOn: string): Promise<'sent' | 'queued' | 'invalid'> {
  if (!isPlausibleDate(seenOn)) return 'invalid';
  const mine = await myReports(); mine[wordId] = seenOn; await write(MINE, mine);
  const ok = await send(wordId, seenOn);
  if (ok) return 'sent';
  const q = await read<{ wordId: string; seenOn: string }[]>(QUEUE, []); q.push({ wordId, seenOn }); await write(QUEUE, q);
  return 'queued';
}

/** Retry anything that failed to send earlier. Safe to call on every launch. */
export async function flushQueue(): Promise<number> {
  const q = await read<{ wordId: string; seenOn: string }[]>(QUEUE, []);
  if (!q.length || !supabase) return 0;
  const left: typeof q = []; let sent = 0;
  for (const item of q) { if (await send(item.wordId, item.seenOn)) sent++; else left.push(item); }
  await write(QUEUE, left);
  return sent;
}

async function send(word_id: string, seen_on: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('sightings').insert({ word_id, seen_on });
  return !error;
}
