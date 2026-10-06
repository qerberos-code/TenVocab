import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';

// ---------------------------------------------------------------- haptics
// expo-haptics is a native module; if a build lacks it, every call is a silent no-op.
let H: any = null;
try { H = require('expo-haptics'); } catch { H = null; }
const run = (fn: () => any) => { try { const p = fn(); p?.catch?.(() => {}); } catch { /* no haptics available */ } };
export const haptic = {
  tap: () => run(() => H?.impactAsync(H.ImpactFeedbackStyle.Light)),
  success: () => run(() => H?.notificationAsync(H.NotificationFeedbackType.Success)),
  soft: () => run(() => H?.impactAsync(H.ImpactFeedbackStyle.Soft ?? H.ImpactFeedbackStyle.Light)),
};

// ---------------------------------------------------------------- session state
// Lives in memory for one quiz session: current run of right answers, best run, level-ups.
export const fx = {
  combo: 0, best: 0, levelUps: 0,
  reset() { this.combo = 0; this.best = 0; this.levelUps = 0; },
};

// ---------------------------------------------------------------- levels
export const LEVELS = [
  { name: 'New', emoji: '🌱' },
  { name: 'Learning', emoji: '📚' },
  { name: 'Strong', emoji: '💪' },
  { name: 'Mastered', emoji: '⭐' },
];
export const levelIndex = (seen: number, mastery: number) => seen <= 0 ? 0 : mastery >= 85 ? 3 : mastery >= 65 ? 2 : 1;

/** Same formula the store uses, so the UI can show a level-up before the store has updated. */
export function afterAnswer(prev: { seen: number; correct: number; mastery: number } | undefined, correct: boolean) {
  const seen = (prev?.seen ?? 0) + 1, c = (prev?.correct ?? 0) + (correct ? 1 : 0);
  return { seen, mastery: Math.min(100, Math.round(((c + 0.5) / (seen + 1)) * 100)) };
}

// ---------------------------------------------------------------- words of encouragement
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
export const cheerRight = () => pick([
  ['🎉', 'Nailed it!'], ['🔥', 'On fire!'], ['🚀', 'Boom! Got it!'], ['⚡', 'Too easy!'],
  ['🙌', 'Look at you!'], ['💥', 'Crushed it!'], ['🧠', 'Big brain energy!'], ['🏆', 'Winner!'],
]);
export const cheerMiss = () => pick([
  ['💪', 'Not yet!'], ['🌱', 'Still growing!'], ['🧩', 'Almost there!'], ['🔁', 'Round two soon!'],
]);
export const missLine = () => pick([
  "This one's headed to your Review pile. You'll get another shot soon.",
  'Misses are how words stick. It is back in your pile for another try.',
  'Your brain just flagged this word as important. See you again soon!',
]);
export const comboLine = (n: number) => n >= 5 ? `⚡ ${n} in a row! Unstoppable!` : n >= 3 ? `🔥 ${n} in a row!` : n === 2 ? '✨ 2 in a row!' : '';

// ---------------------------------------------------------------- confetti
const CONFETTI_EMOJI = ['🎉', '✨', '⭐', '🔥', '💥', '🎊'];
const CONFETTI_COLORS = ['#2E5BFF', '#1A9B63', '#D49400', '#FF5C8A', '#8B5CF6', '#00C2FF'];
type P = { x: number; y: number; dx: number; rise: number; fall: number; spin: number; delay: number; size: number; emoji?: string; color: string };

function Particle({ t, p }: { t: Animated.Value; p: P }) {
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
  const translateY = t.interpolate({ inputRange: [0, p.delay, 1], outputRange: [0, p.rise, p.fall] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] });
  const opacity = t.interpolate({ inputRange: [0, 0.06, 0.78, 1], outputRange: [0, 1, 1, 0] });
  return <Animated.View style={{ position: 'absolute', left: p.x, top: p.y, opacity, transform: [{ translateX }, { translateY }, { rotate }] }}>
    {p.emoji ? <Text style={{ fontSize: p.size }}>{p.emoji}</Text> : <View style={{ width: p.size * 0.55, height: p.size, backgroundColor: p.color, borderRadius: 2 }} />}
  </Animated.View>;
}

/**
 * Confetti overlay. Raise `burst` (1, 2, 3 ...) to fire it; 0 means idle.
 * 'pop' erupts from mid-screen; 'big' rains from the top of the screen.
 */
export function Confetti({ burst, size = 'pop' }: { burst: number; size?: 'pop' | 'big' }) {
  const { width, height } = Dimensions.get('window');
  const t = useRef(new Animated.Value(0)).current;
  const particles = useMemo<P[]>(() => {
    const n = size === 'big' ? 54 : 26, rnd = (a: number, b: number) => a + Math.random() * (b - a);
    return Array.from({ length: n }, (_, i) => {
      const emoji = i % 3 === 0 ? CONFETTI_EMOJI[i % CONFETTI_EMOJI.length] : undefined;
      const base = { size: emoji ? rnd(18, 28) : rnd(9, 15), color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], emoji, spin: rnd(-540, 540) };
      return size === 'big'
        ? { ...base, x: rnd(0, width), y: -40, dx: rnd(-70, 70), rise: rnd(0, 40), fall: height + 120, delay: rnd(0.05, 0.4) }
        : { ...base, x: width / 2 + rnd(-30, 30), y: height * 0.36, dx: rnd(-170, 170), rise: -rnd(110, 260), fall: rnd(120, 340), delay: rnd(0.25, 0.45) };
    });
  }, [burst, size, width, height]);
  useEffect(() => {
    if (!burst) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: size === 'big' ? 2600 : 1700, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [burst]);
  if (!burst) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>{particles.map((p, i) => <Particle key={`${burst}-${i}`} t={t} p={p} />)}</View>;
}

// ---------------------------------------------------------------- small animations
/** Springs its child in from small to full size. */
export function Pop({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, friction: 4, tension: 120, delay, useNativeDriver: true }).start(); }, []);
  return <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>{children}</Animated.View>;
}

/** A friendly side-to-side wobble, for a miss: playful, not alarming. */
export function Wobble({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([-1, 1, -0.6, 0.6, 0].map(x => Animated.timing(v, { toValue: x, duration: 110, useNativeDriver: true })) as any).start();
  }, []);
  return <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] }) }] }}>{children}</Animated.View>;
}

/** Gentle looping pulse, e.g. for the streak flame. */
export function Pulse({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}>{children}</Animated.View>;
}

/** A bar that fills from 0 to `pct` when it appears. */
export function FillBar({ pct, color, height = 14 }: { pct: number; color: string; height?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: pct, duration: 1100, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [pct]);
  return <View style={{ height, borderRadius: height / 2, backgroundColor: '#ECEEF3', overflow: 'hidden' }}>
    <Animated.View style={{ height, backgroundColor: color, width: v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
  </View>;
}
