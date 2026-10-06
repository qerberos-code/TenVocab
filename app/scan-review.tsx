import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, Screen, colors, s } from '@/ui';
import { takePending } from '@/scanSession';
import { cardFrom, createDeck, defaultName } from '@/decks';

/** Check the words the scan found, drop the strays, name the deck, save. */
export default function ScanReview() {
  const r = useRouter();
  const found = useMemo(takePending, []);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const sat = found.filter(c => c.entry && c.entry.source !== 'wordnet').length;
  const general = found.filter(c => c.entry?.source === 'wordnet').length;
  const toggle = (k: string) => setOff(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const chosen = found.filter(c => !off.has(c.key));
  const save = async () => { const deck = await createDeck(name, chosen.map(cardFrom)); r.replace(`/deck/${deck.id}`); };

  if (!found.length) return <Screen><Text style={[s.title, { marginTop: 20 }]}>Nothing to review</Text><View style={{ marginTop: 18 }}><Button label="BACK" secondary onPress={() => r.replace('/scan')} /></View></Screen>;
  return <Screen><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
    <View style={s.row}><Text style={s.title}>Found {found.length}</Text><Text style={{ fontSize: 14, fontWeight: '800', color: colors.muted }}>{chosen.length} selected</Text></View>
    <Text style={[s.subtitle, { marginTop: 8 }]}>{sat} SAT/ACT words, {general} with a general meaning{found.length - sat - general ? `, ${found.length - sat - general} with no entry (grey)` : ''}. Tap a word to leave it out. Solid blue is an SAT/ACT word, outlined blue has a general English meaning.</Text>
    <Card style={{ marginTop: 18 }}>
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '800' }}>DECK NAME</Text>
      <TextInput value={name} onChangeText={setName} placeholder={defaultName()} placeholderTextColor={colors.muted} style={{ fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: 6, paddingVertical: 4 }} />
    </Card>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
      {found.map(c => { const on = !off.has(c.key); return <Pressable key={c.key} onPress={() => toggle(c.key)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={({ pressed }) => [{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: on ? (c.entry ? colors.blue : colors.muted) : colors.line, backgroundColor: on ? (c.entry ? (c.entry.source === 'wordnet' ? '#F2F5FF' : colors.blue) : '#EEF1F8') : '#fff' }, pressed && { opacity: .6 }]}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: on ? (c.entry ? (c.entry.source === 'wordnet' ? colors.blue : '#fff') : colors.ink) : colors.muted, textDecorationLine: on ? 'none' : 'line-through' }}>{c.shown}</Text>
      </Pressable>; })}
    </View>
    <View style={{ marginTop: 22, gap: 10 }}>
      <Button label={`SAVE ${chosen.length} FLASHCARD${chosen.length === 1 ? '' : 'S'}`} onPress={save} />
      <Button label="SCAN AGAIN" secondary onPress={() => r.replace('/scan')} />
    </View>
  </ScrollView></Screen>;
}
