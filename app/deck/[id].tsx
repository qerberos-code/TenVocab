import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { Button, Card, Screen, colors, s } from '@/ui';
import { canRecognizeText, showSystemDefinition } from '../../modules/text-recognizer';
const canLookUp = canRecognizeText;   // iOS native build; Apple's sheet explains itself if a dictionary still needs downloading
import { deleteDeck, loadDecks, updateDeck, type Card as FlashCard, type Deck } from '@/decks';

const speak = (t: string) => { Speech.stop(); Speech.speak(t, { language: 'en-US', rate: 0.85 }); };

/** Flashcard viewer: word on the front, meaning and example on the back. Tap to flip. */
export default function DeckScreen() {
  const r = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [order, setOrder] = useState<string[]>([]);   // card ids in this pass
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<'study' | 'summary' | 'list'>('study');
  const [edit, setEdit] = useState<FlashCard | null>(null);

  useEffect(() => { loadDecks().then(all => { const d = all.find(x => x.id === id) ?? null; setDeck(d); if (d) setOrder(d.cards.map(c => c.id)); }); }, [id]);
  const card = useMemo(() => deck?.cards.find(c => c.id === order[i]) ?? null, [deck, order, i]);
  const persist = (d: Deck) => { setDeck(d); updateDeck(d).catch(() => {}); };

  const answer = (known: boolean) => {
    if (!deck || !card) return;
    persist({ ...deck, cards: deck.cards.map(c => c.id === card.id ? { ...c, known } : c) });
    setFlipped(false);
    if (i + 1 < order.length) setI(i + 1); else setMode('summary');
  };
  const restart = (ids: string[]) => { setOrder(ids); setI(0); setFlipped(false); setMode('study'); };
  const remove = () => Alert.alert('Delete this deck?', 'The flashcards in it will be removed from this phone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDeck(deck!.id); r.replace('/scan'); } }]);
  const saveEdit = () => { if (!deck || !edit) return; persist({ ...deck, cards: deck.cards.map(c => c.id === edit.id ? edit : c) }); setEdit(null); };

  if (!deck) return <Screen><Text style={[s.subtitle, { marginTop: 20 }]}>Loading…</Text></Screen>;
  const missed = deck.cards.filter(c => !c.known);

  if (edit) return <Screen><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
    <Text style={s.title}>{edit.word}</Text>
    <Text style={[s.subtitle, { marginTop: 8 }]}>Write the meaning the way you want to remember it.</Text>
    <Card style={{ marginTop: 18, gap: 14 }}>
      <View><Text style={lbl}>PART OF SPEECH</Text><TextInput value={edit.partOfSpeech} onChangeText={v => setEdit({ ...edit, partOfSpeech: v })} placeholder="noun, verb, adjective…" placeholderTextColor={colors.muted} autoCapitalize="none" style={inp} /></View>
      <View><Text style={lbl}>DEFINITION</Text><TextInput value={edit.definition} onChangeText={v => setEdit({ ...edit, definition: v })} multiline placeholder="What it means" placeholderTextColor={colors.muted} style={[inp, { minHeight: 70 }]} /></View>
      <View><Text style={lbl}>EXAMPLE SENTENCE</Text><TextInput value={edit.example} onChangeText={v => setEdit({ ...edit, example: v })} multiline placeholder="Use it in a sentence" placeholderTextColor={colors.muted} style={[inp, { minHeight: 70 }]} /></View>
    </Card>
    <View style={{ marginTop: 18, gap: 10 }}><Button label="SAVE" onPress={saveEdit} /><Button label="CANCEL" secondary onPress={() => setEdit(null)} /></View>
  </ScrollView></Screen>;

  if (mode === 'list') return <Screen><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
    <View style={s.row}><Text style={s.title}>{deck.name}</Text><Text style={{ fontSize: 14, fontWeight: '800', color: colors.muted }}>{deck.cards.length}</Text></View>
    <Text style={[s.subtitle, { marginTop: 8 }]}>Tap a word to hear it. Tap the pencil to edit a card.</Text>
    {deck.cards.map(c => <Card key={c.id} style={{ marginTop: 12 }}>
      <View style={s.row}>
        <Pressable onPress={() => speak(c.word)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8 }, pressed && { opacity: .55 }]}><Text style={{ fontSize: 20, fontWeight: '800' }}>{c.word}</Text><Text style={{ fontSize: 15 }}>🔊</Text></Pressable>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}><Text style={{ fontSize: 13, fontWeight: '800', color: c.known ? colors.green : colors.muted }}>{c.known ? 'KNOWN' : 'LEARNING'}</Text><Pressable onPress={() => setEdit(c)} hitSlop={10} accessibilityLabel={`Edit ${c.word}`}><Text style={{ fontSize: 16 }}>✎</Text></Pressable></View>
      </View>
      <Text style={[s.subtitle, { marginTop: 6 }]}>{c.definition || 'No definition yet. Tap ✎ to add one.'}</Text>
    </Card>)}
    <View style={{ marginTop: 18, gap: 10 }}><Button label="STUDY" onPress={() => restart(deck.cards.map(c => c.id))} /><Button label="DELETE DECK" secondary onPress={remove} /><Button label="BACK" secondary onPress={() => r.replace('/scan')} /></View>
  </ScrollView></Screen>;

  if (mode === 'summary' || !card) return <Screen><ScrollView contentContainerStyle={s.scroll}>
    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.blue }}>{deck.name.toUpperCase()}</Text>
    <Text style={[s.title, { marginTop: 8 }]}>Pass complete</Text>
    <Card style={{ marginTop: 18 }}>
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '700' }}>KNOWN</Text>
      <Text style={{ fontSize: 34, fontWeight: '800', marginTop: 6 }}>{deck.cards.length - missed.length} / {deck.cards.length}</Text>
      <View style={{ height: 12, borderRadius: 8, backgroundColor: '#ECEEF3', marginTop: 10, overflow: 'hidden' }}><View style={{ height: 12, width: `${deck.cards.length ? Math.round((deck.cards.length - missed.length) / deck.cards.length * 100) : 0}%`, backgroundColor: colors.green }} /></View>
      {missed.length ? <Text style={[s.subtitle, { marginTop: 12 }]}>Still learning: {missed.map(c => c.word).join(', ')}</Text> : <Text style={[s.subtitle, { marginTop: 12 }]}>Every card in this deck is marked known. Come back tomorrow and check they stuck.</Text>}
    </Card>
    <View style={{ marginTop: 18, gap: 10 }}>
      {missed.length ? <Button label={`REVIEW ${missed.length} MISSED`} onPress={() => restart(missed.map(c => c.id))} /> : null}
      <Button label="START OVER" secondary={!!missed.length} onPress={() => restart(deck.cards.map(c => c.id))} />
      <Button label="ALL CARDS" secondary onPress={() => setMode('list')} />
      <Button label="BACK TO SCAN" secondary onPress={() => r.replace('/scan')} />
    </View>
  </ScrollView></Screen>;

  return <Screen><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
    <View style={s.row}>
      <Pressable onPress={() => r.replace('/scan')} hitSlop={10}><Text style={{ fontSize: 14, fontWeight: '700', color: colors.muted }}>‹ {deck.name}</Text></Pressable>
      <Pressable onPress={() => setMode('list')} hitSlop={10}><Text style={{ fontSize: 14, fontWeight: '800' }}>{i + 1}/{order.length} ≡</Text></Pressable>
    </View>
    <Pressable onPress={() => setFlipped(f => !f)} accessibilityRole="button" accessibilityLabel={flipped ? 'Show the word' : 'Show the meaning'} style={({ pressed }) => [pressed && { opacity: .9 }]}>
      <Card style={{ marginTop: 18, minHeight: 360, justifyContent: 'center', backgroundColor: flipped ? '#F2F5FF' : '#fff' }}>
        {!flipped ? <View style={{ alignItems: 'center', gap: 14 }}>
          {card.partOfSpeech ? <View style={s.pill}><Text style={s.pillText}>{card.partOfSpeech.toUpperCase()}</Text></View> : null}
          <Text style={{ fontSize: 40, fontWeight: '900', letterSpacing: 1, textAlign: 'center' }}>{card.word.toUpperCase()}</Text>
          <Pressable onPress={() => speak(card.word)} hitSlop={10} accessibilityLabel={`Pronounce ${card.word}`} style={({ pressed }) => [pressed && { opacity: .5 }]}><Text style={{ fontSize: 26 }}>🔊</Text></Pressable>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 20 }}>Tap to flip</Text>
        </View> : <View>
          <Text style={{ fontSize: 13, fontWeight: '800', color: colors.muted }}>{card.word.toUpperCase()}{card.partOfSpeech ? ` · ${card.partOfSpeech}` : ''}</Text>
          {card.definition ? <>
            <Text style={{ fontSize: 24, fontWeight: '700', lineHeight: 32, marginTop: 14 }}>{card.definition}</Text>
            {card.source === 'wordnet' ? <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '700', marginTop: 8 }}>GENERAL MEANING · not an SAT-specific sense</Text> : null}
            {card.altDefinition ? <><Text style={lbl2}>ALSO MEANS</Text><Text style={{ fontSize: 17, fontWeight: '600', lineHeight: 24, marginTop: 6 }}>{card.altDefinition}</Text></> : null}
            {card.example ? <><Text style={lbl2}>EXAMPLE</Text><Text style={{ fontSize: 17, lineHeight: 25, marginTop: 6 }}>{card.example}</Text></> : null}
            {card.synonyms.length ? <><Text style={lbl2}>SIMILAR WORDS</Text><Text style={{ fontSize: 16, marginTop: 6 }}>{card.synonyms.join(' • ')}</Text></> : null}
          </> : <>
            <Text style={{ fontSize: 20, fontWeight: '700', lineHeight: 28, marginTop: 14 }}>This word is not in the Ten Vocab dictionary yet.</Text>
            <Text style={[s.subtitle, { marginTop: 10 }]}>Add the meaning from your class notes so the card is complete.</Text>
            <View style={{ marginTop: 16, gap: 10 }}>
              {canLookUp ? <Button label="LOOK UP IN IPHONE DICTIONARY" onPress={() => showSystemDefinition(card.word).catch(() => {})} /> : null}
              <Button label="ADD A DEFINITION" secondary onPress={() => setEdit(card)} />
            </View>
          </>}
        </View>}
      </Card>
    </Pressable>
    <View style={{ marginTop: 14, gap: 10 }}>
      <Button label="GOT IT" onPress={() => answer(true)} />
      <Button label="STILL LEARNING" secondary onPress={() => answer(false)} />
    </View>
  </ScrollView></Screen>;
}
const lbl = { fontSize: 12, color: colors.muted, fontWeight: '800' as const };
const lbl2 = { fontSize: 12, color: colors.muted, fontWeight: '800' as const, marginTop: 20 };
const inp = { fontSize: 17, lineHeight: 24, color: colors.ink, marginTop: 6, paddingVertical: 4 };
