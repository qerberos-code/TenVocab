import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, Screen, colors, s } from '@/ui';
const P = ({ children }: { children: React.ReactNode }) => <Text style={{ fontSize: 16, lineHeight: 24, marginTop: 12 }}>{children}</Text>;
const H = ({ children }: { children: React.ReactNode }) => <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '800', marginTop: 22 }}>{children}</Text>;
export default function Privacy() {
  const r = useRouter();
  return <Screen><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
    <Text style={s.title}>Privacy Policy</Text>
    <Text style={[s.subtitle, { marginTop: 8 }]}>Ten Vocab · Last updated September 6, 2026</Text>
    <Card style={{ marginTop: 18 }}>
      <H>THE SHORT VERSION</H>
      <P>Ten Vocab does not collect, store, or share any personal information. There are no accounts, no sign-in, no analytics, and no advertising.</P>
      <H>WHAT STAYS ON YOUR DEVICE</H>
      <P>Your study progress — which words you have seen, your answers, mastery scores, streak, and current session — is saved only on the device you are using. It is never uploaded anywhere. Deleting the app deletes this data.</P>
      <H>NETWORK USE</H>
      <P>The iOS app makes no network requests. Pronunciation uses the speech engine built into your device.</P>
      <P>The web version is delivered by Expo Application Services. Like any website, their servers may record standard access logs, such as your IP address and browser type, solely to serve the page. Ten Vocab does not receive or use this information.</P>
      <H>CHILDREN</H>
      <P>Because no personal information is collected, none is collected from children.</P>
      <H>CHANGES</H>
      <P>If this policy ever changes, the update will appear on this page with a new date.</P>
      <H>CONTACT</H>
      <P>angus@qerberos.com</P>
    </Card>
    <View style={{ marginTop: 18 }}><Button label="BACK" secondary onPress={() => r.canGoBack() ? r.back() : r.replace('/')} /></View>
  </ScrollView></Screen>;
}
