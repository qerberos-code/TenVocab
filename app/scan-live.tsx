import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, colors } from '@/ui';
import { recognizeText } from '../modules/text-recognizer';
import { extractCandidates, type Candidate } from '@/lexicon';
import { setPending } from '@/scanSession';

const INTERVAL_MS = 1100;   // one frame about every second: slow enough to read, fast enough to follow a hand

/**
 * Live scanning. Start, then sweep the phone slowly across the list; each frame is
 * read on the device and new words are added to the pile. Stop when the count stalls.
 */
export default function ScanLive() {
  const r = useRouter();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef<CameraView | null>(null);
  const [running, setRunning] = useState(false);
  const [found, setFound] = useState<Candidate[]>([]);
  const [frames, setFrames] = useState(0);
  const foundRef = useRef<Map<string, Candidate>>(new Map());
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { if (perm && !perm.granted && perm.canAskAgain) requestPerm(); }, [perm]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const tick = async () => {
    if (busy.current || !cam.current) return;
    busy.current = true;
    try {
      const pic = await cam.current.takePictureAsync({ quality: 0.5, skipProcessing: true, shutterSound: false });
      if (!pic?.uri) return;
      const lines = await recognizeText(pic.uri, true);
      let added = false;
      for (const c of extractCandidates(lines)) if (!foundRef.current.has(c.key)) { foundRef.current.set(c.key, c); added = true; }
      setFrames(n => n + 1);
      if (added) setFound([...foundRef.current.values()]);
    } catch { /* a dropped frame is fine; the next one comes in a second */ }
    finally { busy.current = false; }
  };
  const start = () => { setRunning(true); tick(); timer.current = setInterval(tick, INTERVAL_MS); };
  const stop = () => { setRunning(false); if (timer.current) { clearInterval(timer.current); timer.current = null; } };
  const done = () => { stop(); setPending([...foundRef.current.values()]); r.replace('/scan-review'); };

  if (!perm) return <View style={st.root} />;
  if (!perm.granted) return <View style={[st.root, { padding: 24, justifyContent: 'center', gap: 14 }]}>
    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Camera access needed</Text>
    <Text style={{ color: '#CCD', fontSize: 15, lineHeight: 22 }}>Ten Vocab reads the list through the camera. Frames are processed on this phone and never leave it.</Text>
    {perm.canAskAgain ? <Button label="ALLOW CAMERA" onPress={requestPerm} /> : <Text style={{ color: '#CCD' }}>Enable the camera for Ten Vocab in Settings.</Text>}
    <Button label="BACK" secondary onPress={() => r.back()} />
  </View>;

  return <View style={st.root}>
    <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" animateShutter={false} />
    <View style={st.top}>
      <Pressable onPress={() => { stop(); r.back(); }} hitSlop={12}><Text style={st.topText}>✕ Cancel</Text></Pressable>
      <Text style={st.topText}>{found.length} {found.length === 1 ? 'word' : 'words'}{frames ? ` · ${frames} frames` : ''}</Text>
    </View>
    <View style={st.frame} pointerEvents="none" />
    <View style={st.bottom}>
      <Text style={st.hint}>{running ? 'Sweep slowly across the list. Pause on each column for a second.' : 'Hold the list in the frame, then start. Move slowly; it keeps reading as you go.'}</Text>
      {found.length ? <View style={st.chips}>{found.slice(-18).map(c => <View key={c.key} style={[st.chip, !c.entry && st.chipUnknown]}><Text style={st.chipText}>{c.shown}</Text></View>)}</View> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>{running ? <Button label="PAUSE" secondary onPress={stop} /> : <Button label={frames ? 'RESUME' : 'START SCANNING'} onPress={start} />}</View>
        {found.length ? <View style={{ flex: 1 }}><Button label={`DONE (${found.length})`} onPress={done} /></View> : null}
      </View>
    </View>
  </View>;
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', top: 56, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  topText: { color: '#fff', fontSize: 15, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 6 },
  frame: { position: 'absolute', top: '16%', bottom: '38%', left: 18, right: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.75)', borderRadius: 18 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: 40, backgroundColor: 'rgba(10,12,16,0.82)', gap: 14 },
  hint: { color: '#E6E7EB', fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.blue },
  chipUnknown: { backgroundColor: '#3A3F48' },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
