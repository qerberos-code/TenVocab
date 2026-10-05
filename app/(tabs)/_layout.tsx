import { Tabs } from 'expo-router';
import { Text } from 'react-native';
const icon = (g: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{g}</Text>;
export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2E5BFF', tabBarLabelStyle: { fontSize: 12 }, tabBarStyle: { height: 68, paddingTop: 8, paddingBottom: 10 } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('⌂') }} />
    <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: icon('▤') }} />
    <Tabs.Screen name="quiz" options={{ title: 'Quiz', tabBarIcon: icon('?') }} />
    <Tabs.Screen name="scan" options={{ title: 'Scan', tabBarIcon: icon('⌕') }} />
    <Tabs.Screen name="progress" options={{ title: 'Stats', tabBarIcon: icon('◒') }} />
  </Tabs>;
}
