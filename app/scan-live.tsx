import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, colors } from '@/ui';
import * as Speech from 'expo-speech';
import { recognizeWords, showSystemDefinition } from '../modules/text-recognizer';
import { lookup, normalize, type Candidate } from '@/lexicon';
import { setPending } from '@/scanSession';

const INTERVAL_MS = 600;         // how often a frame is read while aiming (the next waits for the last to finish)
const TARGET = { dx: 0.36, dy: 0.14 };   // how far from the image center a word may sit and still count (normalized)
const ZOOM_STEPS = [0, 0.12, 0.25, 0.4, 0.6];

/**
 * One word at a time. Aim the target box at a word (zoom in if the print is small);
 * the word under the box is shown live with its meaning. Tap ADD to put it in the deck,
 * move to the next word, repeat. DONE turns the collected words into flashcards.
 */
export default function ScanLive() {
  const r = useRouter();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView | null>(null);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [aim, setAim] = useState<Candidate | null>(null);   // word under the target right now
  const [seen, setSeen] = useState<string[] | null>(null);     // nearest words the camera can read, shown when none is in the box
  const [picked, setPicked] = useState<Candidate[]>([]);
  const pickedRef = useRef<Map<string, Candidate>>(new Map());
  const busy = useRef(false);
  const missStreak = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (perm && !perm.granted && perm.canAskAgain) requestPerm(); }, [perm]);
  useEffect(() => {
    if (!perm?.granted) return;
    timer.current = setInterval(tick, INTERVAL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [perm?.granted]);

  // Read one frame and keep only the word nearest the center of the target box.
  const tick = async () => {
    if (busy.current || !cam.current) return;
    busy.current = true;
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.7, skipProcessing: true, shutterSound: false });
      if (!pic?.uri) return;
      const words = await recognizeWords(pic.uri, false);
      let best: { d: number; text: string } | null = null;
      const nearby: { d: number; text: string }[] = [];
      for (const w of words) {
        const t = normalize(w.text);
        if (t.length < 3 || !/^[a-z][a-z'-]*$/.test(t)) continue;
        const cx = w.x + w.w / 2 - 0.5, cy = w.y + w.h / 2 - 0.5;
        nearby.push({ d: Math.hypot(cx, cy), text: t });
        if (Math.abs(cx) > TARGET.dx || Math.abs(cy) > TARGET.dy) continue;
        const d = Math.hypot(cx / TARGET.dx, cy / TARGET.dy);
        if (!best || d < best.d) best = { d, text: t };
      }
      setSeen(nearby.sort((a, b) => a.d - b.d).slice(0, 3).map(x => x.text));
      if (best) {
        missStreak.current = 0;
        const e = lookup(best.text);
        setAim(prev => prev?.key === (e ? e.word.toLowerCase() : best!.text) ? prev : { key: e ? e.word.toLowerCase() : best!.text, shown: e ? e.word : best!.text, entry: e });
      } else if (++missStreak.current >= 3) setAim(null);   // keep the last hit through a shaky frame or two
    } catch { /* dropped frame; the next one is 0.7 s away */ }
    finally { busy.current = false; }
  };

  const add = () => {
    if (!aim || pickedRef.current.has(aim.key)) return;
    pickedRef.current.set(aim.key, aim);
    setPicked([...pickedRef.current.values()]);
  };
  const remove = (k: string) => { pickedRef.current.delete(k); setPicked([...pickedRef.current.values()]); };
  const done = () => { if (timer.current) clearInterval(timer.current); setPending([...pickedRef.current.values()]); r.replace('/scan-review'); };
  const already = !!aim && pickedRef.current.has(aim.key);
  const speak = (w: string) => { Speech.stop(); Speech.speak(w, { language: 'en-US', rate: 0.85 }); };
  const canLookUp = !!aim && !aim.entry;

  if (!perm) return <View style={st.root} />;
  if (!perm.granted) return <View style={[st.root, { padding: 24, justifyContent: 'center', gap: 14 }]}>
    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Camera access needed</Text>
    <Text style={{ color: '#CCD', fontSize: 15, lineHeight: 22 }}>Ten Vocab reads the word through the camera. Frames are processed on this phone and never leave it.</Text>
    {perm.canAskAgain ? <Button label="ALLOW CAMERA" onPress={requestPerm} /> : <Text style={{ color: '#CCD' }}>Enable the camera for Ten Vocab in Settings.</Text>}
    <Button label="BACK" secondary onPress={() => r.back()} />
  </View>;

  return <View style={st.root}>
    <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" zoom={ZOOM_STEPS[zoomIdx]} animateShutter={false} />
    <View style={st.top}>
      <Pressable onPress={() => r.back()} hitSlop={12}><Text style={st.topText}>✕ Cancel</Text></Pressable>
      <Text style={st.topText}>{picked.length} added</Text>
    </View>

    {/* target box: the word inside it is the one that gets read */}
    <View style={st.targetWrap} pointerEvents="none">
      <View style={[st.target, aim && st.targetHit]} />
    </View>

    {/* zoom */}
    <View style={st.zoom}>
      <Pressable onPress={() => setZoomIdx(i => Math.max(0, i - 1))} hitSlop={10} style={st.zoomBtn}><Text style={st.zoomText}>−</Text></Pressable>
      <Text style={[st.zoomText, { minWidth: 44, textAlign: 'center' }]}>{zoomIdx === 0 ? '1×' : `${1 + zoomIdx}×`}</Text>
      <Pressable onPress={() => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1))} hitSlop={10} style={st.zoomBtn}><Text style={st.zoomText}>+</Text></Pressable>
    </View>

    <View style={st.bottom}>
      {aim ? <View>
        <Pressable onPress={() => speak(aim.shown)} accessibilityRole="button" accessibilityLabel={`Pronounce ${aim.shown}`} hitSlop={8} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12 }, pressed && { opacity: .6 }]}>
          <Text style={st.word}>{aim.shown}</Text><Text style={{ fontSize: 24 }}>🔊</Text>
        </Pressable>
        {aim.entry ? <>
          <Text style={st.def}>{aim.entry.partOfSpeech} · {aim.entry.definition}</Text>
          {aim.entry.example ? <Text style={st.ex}>“{aim.entry.example}”</Text> : null}
          {aim.entry.synonyms.length ? <Text style={st.syn}>Similar: {aim.entry.synonyms.join(' • ')}</Text> : null}
          {aim.entry.source === 'wordnet' ? <Text style={st.gen}>General meaning, not SAT-specific</Text> : null}
        </> : <>
          <Text style={st.def}>No dictionary entry on this phone for this word.</Text>
          {canLookUp ? <Pressable onPress={() => showSystemDefinition(aim.shown).catch(() => {})} hitSlop={8} style={({ pressed }) => [{ marginTop: 8 }, pressed && { opacity: .6 }]}><Text style={st.look}>Look up in iPhone dictionary ›</Text></Pressable> : null}
        </>}
      </View> : <Text style={st.hint}>Center one word in the box. Zoom in if the print is small, and hold still for a moment.</Text>}
      {picked.length ? <View style={st.chips}>{picked.slice(-12).map(c => <Pressable key={c.key} onPress={() => remove(c.key)} hitSlop={6} style={[st.chip, !c.entry && st.chipUnknown]}><Text style={st.chipText}>{c.shown} ✕</Text></Pressable>)}</View> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1.4 }}><Pressable onPress={add} disabled={!aim || already} style={({ pressed }) => [st.addBtn, (!aim || already) && { opacity: .45 }, pressed && { opacity: .7 }]}><Text style={st.addText}>{already ? 'ADDED' : aim ? `ADD "${aim.shown.toUpperCase()}"` : 'ADD'}</Text></Pressable></View>
        {picked.length ? <View style={{ flex: 1 }}><Button label={`DONE (${picked.length})`} onPress={done} /></View> : null}
      </View>
    </View>
  </View>;
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', top: 56, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  topText: { color: '#fff', fontSize: 15, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 6 },
  targetWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  target: { width: '72%', height: 64, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 14 },
  targetHit: { borderColor: colors.green },
  zoom: { position: 'absolute', right: 16, top: '58%', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(10,12,16,0.7)', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 4 },
  zoomBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  zoomText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: 40, backgroundColor: 'rgba(10,12,16,0.86)', gap: 14 },
  word: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 0.5 },
  def: { color: '#D5D8DF', fontSize: 15, lineHeight: 21, marginTop: 4 },
  ex: { color: '#C3C8D2', fontSize: 14, lineHeight: 20, marginTop: 6, fontStyle: 'italic' },
  gen: { color: '#8A91A0', fontSize: 12, fontWeight: '700', marginTop: 6 },
  syn: { color: '#9FB4FF', fontSize: 14, lineHeight: 20, marginTop: 6 },
  look: { color: '#7FA2FF', fontSize: 15, fontWeight: '800' },
  hint: { color: '#E6E7EB', fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.blue },
  chipUnknown: { backgroundColor: '#3A3F48' },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  addBtn: { backgroundColor: colors.green, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
