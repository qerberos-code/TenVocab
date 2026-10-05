import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, Screen, colors, s } from '@/ui';
import { extractCandidates } from '@/lexicon';
import { setPending } from '@/scanSession';

/** Fallback for the web and for lists that arrive as text: paste, one word per line or comma-separated. */
export default function ScanPaste() {
  const r = useRouter();
  const [text, setText] = useState('');
  const go = () => {
    const found = extractCandidates(text.split(/\n|,|;/));
    if (!found.length) { Alert.alert('No words found', 'Type one word per line, or separate words with commas.'); return; }
    setPending(found); r.replace('/scan-review');
  };
  return <Screen><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
    <Text style={s.title}>Type or paste</Text>
    <Text style={[s.subtitle, { marginTop: 8 }]}>One word per line, or separated by commas. Definitions, numbers and bullets around them are ignored.</Text>
    <Card style={{ marginTop: 18 }}>
      <TextInput value={text} onChangeText={setText} multiline autoFocus autoCapitalize="none" autoCorrect={false} placeholder={'abate\nambiguous\ncorroborate'} placeholderTextColor={colors.muted} style={{ minHeight: 220, fontSize: 17, lineHeight: 24, color: colors.ink, textAlignVertical: 'top' }} />
    </Card>
    <View style={{ marginTop: 18, gap: 10 }}>
      <Button label="MAKE FLASHCARDS" onPress={go} />
      <Button label="BACK" secondary onPress={() => r.back()} />
    </View>
  </ScrollView></KeyboardAvoidingView></Screen>;
}
