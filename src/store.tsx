import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { VOCAB, Word } from './vocab';

type Stats = Record<string, { seen: number; correct: number; incorrect: number; mastery: number; nextReview: number | null }>;
type Store = {
  stats: Stats;
  todayIds: string[];
  sessionIndex: number;
  score: number;
  answers: string[];
  streak: number;
  loading: boolean;
  startSession: () => void;
  recordKnowledge: (id: string, knew: boolean) => void;
  recordQuiz: (id: string, correct: boolean) => void;
  finishSession: () => void;
  getWord: (id: string) => Word;
  resetDemo: () => void;
};

const emptyStats = (): Stats => Object.fromEntries(VOCAB.map(w => [w.id, { seen: 0, correct: 0, incorrect: 0, mastery: 0, nextReview: null }]));
const Ctx = createContext<Store | null>(null);
const KEY = 'vocabsat-state-v2';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [todayIds, setTodayIds] = useState<string[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [streak, setStreak] = useState(7);
  const [lastCompleted, setLastCompleted] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { try { const raw = await AsyncStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); setStats(s.stats || emptyStats()); setStreak(s.streak ?? 7); setTodayIds(s.todayIds ?? []); setSessionIndex(s.sessionIndex ?? 0); setScore(s.score ?? 0); setLastCompleted(s.lastCompleted ?? null); } } finally { setLoading(false); } })(); }, []);
  useEffect(() => { if (!loading) AsyncStorage.setItem(KEY, JSON.stringify({ stats, streak, todayIds, sessionIndex, score, lastCompleted })).catch(() => {}); }, [stats, streak, todayIds, sessionIndex, score, lastCompleted, loading]);

  const ordered = useMemo(() => VOCAB.slice().sort((a,b) => {
    const sa = stats[a.id] ?? { mastery:0, nextReview:null, incorrect:0 };
    const sb = stats[b.id] ?? { mastery:0, nextReview:null, incorrect:0 };
    const due = (s: any) => s.nextReview !== null && s.nextReview <= Date.now() ? 1 : 0;
    return (due(sb)-due(sa)) || (sa.mastery-sb.mastery) || (b.priority-a.priority);
  }), [stats]);

  const startSession = () => {
    const selected = ordered.slice(0, 10).map(w => w.id);
    setTodayIds(selected); setSessionIndex(0); setScore(0); setAnswers([]);
  };
  const recordKnowledge = (id: string, knew: boolean) => { setStats(prev => { const s = prev[id] || { seen:0, correct:0, incorrect:0, mastery:0, nextReview:null }; const seen=s.seen+1, correct=s.correct+(knew?1:0), incorrect=s.incorrect+(knew?0:1); const mastery=Math.min(100, Math.round(((correct + 0.5) / (seen + 1)) * 100)); const delay=knew ? Math.min(14, 1+Math.floor(mastery/25)) : 0; return { ...prev, [id]: { seen, correct, incorrect, mastery, nextReview: Date.now()+delay*86400000 } }; }); setSessionIndex(i=>i+1); };
  const recordQuiz = (id: string, correct: boolean) => { setScore(s=>s+(correct?1:0)); setAnswers(a=>[...a,id]); setStats(prev => { const s=prev[id] || { seen:0, correct:0, incorrect:0, mastery:0, nextReview:null }; const seen=s.seen+1, c=s.correct+(correct?1:0), i=s.incorrect+(correct?0:1); const mastery=Math.min(100, Math.round(((c + 0.5)/(seen + 1))*100)); const days = correct ? (mastery >= 85 ? 7 : mastery >= 65 ? 3 : 1) : 0; return { ...prev, [id]: { seen, correct:c, incorrect:i, mastery, nextReview: Date.now()+days*86400000 } }; }); setSessionIndex(i=>i+1); if (todayIds.length && sessionIndex >= todayIds.length-1) { const today=new Date().toISOString().slice(0,10); if (lastCompleted!==today) { setStreak(s=>s+1); setLastCompleted(today); } } };
  const finishSession = () => { setSessionIndex(0); };
  const resetDemo = () => { setStats(emptyStats()); setTodayIds([]); setSessionIndex(0); setScore(0); setAnswers([]); setStreak(7); setLastCompleted(null); AsyncStorage.removeItem(KEY).catch(()=>{}); };
  const value: Store = { stats, todayIds, sessionIndex, score, answers, streak, loading, startSession, recordKnowledge, recordQuiz, finishSession, getWord: id => VOCAB.find(w=>w.id===id) ?? VOCAB[0], resetDemo };
  return <Ctx.Provider value={value}>{loading ? null : children}</Ctx.Provider>;
}
export const useStore = () => { const x = useContext(Ctx); if (!x) throw new Error('useStore must be used inside StoreProvider'); return x; };
