import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, Screen, colors, s } from '@/ui';

// The WordNet license requires this notice to accompany the data on every copy.
const WORDNET_LICENSE = "WordNet Release 3.0\n\nThis software and database is being provided to you, the LICENSEE, by\nPrinceton University under the following license.  By obtaining, using\nand/or copying this software and database, you agree that you have\nread, understood, and will comply with these terms and conditions.:\n\nPermission to use, copy, modify and distribute this software and\ndatabase and its documentation for any purpose and without fee or\nroyalty is hereby granted, provided that you agree to comply with\nthe following copyright notice and statements, including the disclaimer,\nand that the same appear on ALL copies of the software, database and\ndocumentation, including modifications that you make for internal\nuse or for distribution.\n\nWordNet 3.0 Copyright 2006 by Princeton University.  All rights reserved.\n\nTHIS SOFTWARE AND DATABASE IS PROVIDED \"AS IS\" AND PRINCETON\nUNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR\nIMPLIED.  BY WAY OF EXAMPLE, BUT NOT LIMITATION, PRINCETON\nUNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES OF MERCHANT-\nABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE\nOF THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT\nINFRINGE ANY THIRD PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR\nOTHER RIGHTS.\n\nThe name of Princeton University or Princeton may not be used in\nadvertising or publicity pertaining to distribution of the software\nand/or database.  Title to copyright in this software, database and\nany associated documentation shall at all times remain with\nPrinceton University and LICENSEE agrees to preserve same.";

export default function Credits() {
  const r = useRouter();
  return <Screen><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
    <Text style={s.title}>Dictionary credits</Text>
    <Text style={[s.subtitle, { marginTop: 8 }]}>Where the words and meanings come from.</Text>
    <Card style={{ marginTop: 18 }}>
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '800' }}>SAT AND ACT WORDS</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, marginTop: 8 }}>The meanings, example sentences and similar words for Ten Vocab's SAT and ACT words are original to this app.</Text>
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '800', marginTop: 22 }}>ALL OTHER WORDS</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, marginTop: 8 }}>For scanned words outside that set, the app shows a general English meaning from WordNet, a lexical database of English. These are marked "General meaning" on the card, because they are not chosen for the SAT or ACT. The data is stored on your phone, so no internet connection is used.</Text>
      <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '800', marginTop: 22 }}>WORDNET LICENSE</Text>
      <Text style={{ fontSize: 13, lineHeight: 19, marginTop: 8, color: colors.ink }}>{WORDNET_LICENSE}</Text>
    </Card>
    <View style={{ marginTop: 18 }}><Button label="BACK" secondary onPress={() => r.canGoBack() ? r.back() : r.replace('/')} /></View>
  </ScrollView></Screen>;
}
