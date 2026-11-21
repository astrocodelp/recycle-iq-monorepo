import { Tabs } from 'expo-router';
import { Clock, House, MapPin, Trophy } from 'lucide-react-native';
import { View } from 'react-native';
import { useApp } from '@/lib/store';
import { colors, font } from '@/lib/theme';

function TabIcon({ Icon, focused }: { Icon: typeof House; focused: boolean }) {
  return (
    <View
      style={{
        width: 54,
        height: 30,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors['lime-wash'] : 'transparent',
      }}
    >
      <Icon size={22} color={focused ? colors['forest-800'] : colors.faint} strokeWidth={focused ? 2.4 : 2} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useApp();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors['forest-800'],
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: font.bold, fontSize: 10.5 },
        tabBarStyle: { backgroundColor: 'rgba(255,255,255,0.96)', borderTopColor: colors.line, height: 72, paddingTop: 8 },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Αρχική', 'Home'), tabBarIcon: ({ focused }) => <TabIcon Icon={House} focused={focused} /> }} />
      <Tabs.Screen name="points" options={{ title: t('Σημεία', 'Points'), tabBarIcon: ({ focused }) => <TabIcon Icon={MapPin} focused={focused} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: t('Κατάταξη', 'Leaderboard'), tabBarIcon: ({ focused }) => <TabIcon Icon={Trophy} focused={focused} /> }} />
      <Tabs.Screen name="history" options={{ title: t('Ιστορικό', 'History'), tabBarIcon: ({ focused }) => <TabIcon Icon={Clock} focused={focused} /> }} />
    </Tabs>
  );
}
