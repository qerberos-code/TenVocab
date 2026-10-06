import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Screen, colors, s } from '@/ui';
import { useStore } from '@/store';
import { Confetti, FillBar, LEVELS, Pop, Wobble, cheerMiss, cheerRight, comboLine, fx, haptic, missLine } from '@/fx';

type Params = { word?: string; correct?: string; explanation?: string; combo?: string; from?: string; to?: string };

export default function Results() {
  const { sessionIndex, todayIds } = useStore();
  const p = useLocalSearchParams<Params>();
  return sessionIndex >= todayIds.length ? <SessionDone p={p} /> : <Answer p={p} />;
}

/** Feedback after each question: a celebration when right, a friendly nudge when not. */
function Answer({ p }: { p: Params }) {
  const r = useRouter();
  const correct = p.correct === '1';
  const combo = parseInt(p.combo ?? '0', 10), from = parseInt(p.from ?? '0', 10), to = parseInt(p.to ?? '0', 10);
  const [emoji, title] = useMemo(() => correct ? cheerRight() : cheerMiss(), []);
  const line = useMemo(missLine, []);
  const [burst, setBurst] = useState(0);
  useEffect(() => { if (correct) { setBurst(1); haptic.success(); } else haptic.soft(); }, []);
  const levelUp = correct && to > from;
  return <Screen>
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center' }}>
        {correct ? <Pop><Text style={{ fontSize: 72 }}>{emoji}</Text></Pop> : <Wobble><Text style={{ fontSize: 72 }}>{emoji}</Text></Wobble>}
        <Text style={[s.title, { marginTop: 12, textAlign: 'center' }]}>{title}</Text>
        <Text style={[s.subtitle, { marginTop: 6, textAlign: 'center', fontWeight: '700', color: colors.ink }]}>{p.word}</Text>
        {correct && comboLine(combo) ? <Pop delay={200}><View style={{ marginTop: 14, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFF1D6' }}><Text style={{ fontSize: 16, fontWeight: '800', color: '#9A5B00' }}>{comboLine(combo)}</Text></View></Pop> : null}
        {levelUp ? <Pop delay={350}><View style={{ marginTop: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#E3F6EC' }}><Text style={{ fontSize: 15, fontWeight: '800', color: colors.green }}>{LEVELS[from].emoji} → {LEVELS[to].emoji}  Level up! Now {LEVELS[to].name}</Text></View></Pop> : null}
        {!correct ? <Text style={[s.subtitle, { marginTop: 10, textAlign: 'center', paddingHorizontal: 10 }]}>{line}</Text> : null}
      </View>
      <Card style={{ marginTop: 24 }}>
        <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '800' }}>{correct ? 'WHY IT WORKS 💡' : 'HERE IS THE TRICK 💡'}</Text>
        <Text style={{ fontSize: 17, lineHeight: 25, marginTop: 8 }}>{p.explanation}</Text>
      </Card>
      <View style={{ marginTop: 18 }}><Button label={correct ? 'NEXT QUESTION 🚀' : 'NEXT QUESTION 💪'} onPress={() => r.replace('/quiz')} /></View>
    </View>
    <Confetti burst={burst} size={combo >= 3 ? 'big' : 'pop'} />
  </Screen>;
}

/** End of a session: the celebration scales with the score, and a rough one still finds the wins. */
function SessionDone({ p }: { p: Params }) {
  const r = useRouter();
  const { todayIds, score } = useStore();
  const n = Math.max(1, todayIds.length);
  const pct = Math.round((score / n) * 100);
  const missed = Math.max(0, todayIds.length - score);
  const best = fx.best, levelUps = fx.levelUps;
  const tier = pct >= 80 ? 'great' : pct >= 50 ? 'ok' : 'rough';
  const [burst, setBurst] = useState(0);
  useEffect(() => { if (tier !== 'rough') { setBurst(1); haptic.success(); } else haptic.soft(); return () => fx.reset(); }, []);
  const hero = tier === 'great' ? ['🏆', 'Crushed it!'] : tier === 'ok' ? ['🔥', 'Solid session!'] : ['💪', 'Good reps!'];
  const next = tier === 'great' ? 'You are building real test-day vocabulary. Come back tomorrow to keep the streak going. 🔥'
    : tier === 'ok' ? 'Most of these are sticking. The ones you missed are in your Review pile and will come back soon.'
    : 'The hard words are the ones worth practicing, and they are now first in line for review. Every rep makes the next round easier.';
  return <Screen>
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center' }}>
        <Pop><Text style={{ fontSize: 72 }}>{hero[0]}</Text></Pop>
        <Text style={[s.title, { marginTop: 12, textAlign: 'center' }]}>{hero[1]}</Text>
        <Text style={{ fontSize: 52, fontWeight: '900', marginTop: 10 }}>{score}/{todayIds.length}</Text>
        <Text style={[s.subtitle, { marginTop: 2, textAlign: 'center' }]}>{pct}% correct{missed ? ` • ${missed} to revisit` : ' • perfect!'}</Text>
      </View>
      <View style={{ marginTop: 18 }}><FillBar pct={pct} color={tier === 'rough' ? colors.yellow : colors.green} /></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' }}>
        {best >= 2 ? <View style={s.pill}><Text style={s.pillText}>🔥 best run: {best}</Text></View> : null}
        {levelUps > 0 ? <View style={s.pill}><Text style={s.pillText}>⬆️ {levelUps} word{levelUps === 1 ? '' : 's'} leveled up</Text></View> : null}
        {score > 0 ? <View style={s.pill}><Text style={s.pillText}>🔒 {score} locked in</Text></View> : null}
      </View>
      <Card style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '800' }}>NEXT STEP</Text>
        <Text style={{ fontSize: 17, lineHeight: 25, fontWeight: '600', marginTop: 7 }}>{next}</Text>
        {p.word ? <Text style={[s.subtitle, { marginTop: 10 }]}>Last word: {p.correct === '1' ? '✅' : '💪'} {p.word}</Text> : null}
      </Card>
      <View style={{ marginTop: 18, gap: 10 }}>
        <Button label="VIEW PROGRESS 📈" onPress={() => r.replace('/progress')} />
        <Button label="BACK HOME" secondary onPress={() => r.replace('/')} />
      </View>
    </View>
    <Confetti burst={burst} size={tier === 'great' ? 'big' : 'pop'} />
  </Screen>;
}
