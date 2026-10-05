import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Screen, colors, s } from '@/ui';
import { canRecognizeText, recognizeText } from '../../modules/text-recognizer';
import { extractCandidates, lexiconSize } from '@/lexicon';
import { setPending } from '@/scanSession';
import { loadDecks, type Deck } from '@/decks';

export default function Scan() {
  const r = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  useFocusEffect(useCallback(() => { loadDecks().then(setDecks); }, []));

  // Reads one or more photos from the library, entirely on the device. iOS's picker hands
  // the app only the photos the user taps, so no library permission is requested.
  const fromPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 6, quality: 1 });
    if (res.canceled) return;
    setBusy(`Reading ${res.assets.length === 1 ? 'photo' : `${res.assets.length} photos`}…`);
    try {
      const lines: string[] = [];
      for (const a of res.assets) lines.push(...await recognizeText(a.uri, false));
      const found = extractCandidates(lines);
      if (!found.length) { Alert.alert('No words found', 'Try a sharper photo, or hold the phone squarely over the list.'); return; }
      setPending(found);
      r.push('/scan-review');
    } catch (e: any) { Alert.alert('Could not read that photo', String(e?.message ?? e)); }
    finally { setBusy(null); }
  };

  return <Screen><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.blue }}>TEN VOCAB</Text>
    <Text style={[s.title, { marginTop: 8 }]}>Scan a word list</Text>
    <Text style={[s.subtitle, { marginTop: 8 }]}>Point the camera at a vocabulary list, or pick a photo of one. Every word becomes a flashcard with its SAT meaning and an example sentence. Reading happens on this phone, so it works with no internet.</Text>

    <Card style={{ marginTop: 22, gap: 10 }}>
      {busy ? <View style={{ alignItems: 'center', paddingVertical: 12, gap: 10 }}><ActivityIndicator color={colors.blue} /><Text style={s.subtitle}>{busy}</Text></View> : <>
        {canRecognizeText ? <>
          <Button label="LIVE SCAN WITH CAMERA" onPress={() => r.push('/scan-live')} />
          <Button label="FROM A PHOTO" secondary onPress={fromPhotos} />
        </> : <Text style={[s.subtitle, { marginBottom: 4 }]}>{Platform.OS === 'web' ? 'Camera and photo scanning are available in the iPhone app.' : 'Camera and photo scanning need the Ten Vocab app from the App Store or TestFlight, not Expo Go.'}</Text>}
        <Button label="TYPE OR PASTE WORDS" secondary onPress={() => r.push('/scan-paste')} />
      </>}
      <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>Dictionary on this phone: {lexiconSize().toLocaleString()} words.</Text>
    </Card>

    <View style={[s.row, { marginTop: 26 }]}><Text style={{ fontSize: 20, fontWeight: '800' }}>My flashcard decks</Text><Text style={{ fontSize: 14, fontWeight: '800', color: colors.muted }}>{decks.length}</Text></View>
    {decks.length === 0 ? <Text style={[s.subtitle, { marginTop: 8 }]}>Decks you scan will appear here. They stay on this device.</Text> : null}
    {decks.map(d => {
      const known = d.cards.filter(c => c.known).length;
      return <Pressable key={d.id} onPress={() => r.push(`/deck/${d.id}`)} accessibilityRole="button" accessibilityLabel={`Open deck ${d.name}`}>
        <Card style={{ marginTop: 12 }}>
          <View style={s.row}><Text style={{ fontSize: 18, fontWeight: '800' }}>{d.name}</Text><Text style={{ fontSize: 18, color: colors.muted }}>›</Text></View>
          <Text style={[s.subtitle, { marginTop: 4 }]}>{d.cards.length} cards · {known} known</Text>
          <View style={{ height: 8, borderRadius: 6, backgroundColor: '#ECEEF3', marginTop: 10, overflow: 'hidden' }}><View style={{ height: 8, width: `${d.cards.length ? Math.round(known / d.cards.length * 100) : 0}%`, backgroundColor: colors.green }} /></View>
        </Card>
      </Pressable>;
    })}
  </ScrollView></Screen>;
}
