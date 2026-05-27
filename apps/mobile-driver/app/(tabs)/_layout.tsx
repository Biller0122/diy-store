import { Tabs } from 'expo-router';
import { Text } from 'react-native';

function Icon({ emoji, size = 22 }: { emoji: string; size?: number }) {
  return <Text style={{ fontSize: size }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a2e',
          borderTopColor: '#2a2a40',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#666688',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Самбар',
          tabBarIcon: ({ focused }) => (
            <Icon emoji="🏠" size={focused ? 24 : 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="delivery"
        options={{
          title: 'Хүргэлт',
          tabBarIcon: ({ focused }) => (
            <Icon emoji="📦" size={focused ? 24 : 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Орлого',
          tabBarIcon: ({ focused }) => (
            <Icon emoji="💰" size={focused ? 24 : 22} />
          ),
        }}
      />
    </Tabs>
  );
}
