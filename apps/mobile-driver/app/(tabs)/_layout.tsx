import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme';
import { useDeliveryStore } from '../../src/store/delivery';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function iconName(focused: boolean, active: IconName, inactive: IconName) {
  return focused ? active : inactive;
}

export default function TabsLayout() {
  const hasActiveOrder = useDeliveryStore((state) => !!state.activeOrder);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(8,8,14,0.97)',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 18,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Нүүр',
          tabBarIcon: ({ focused, color }) => <Ionicons name={iconName(focused, 'home', 'home-outline')} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="delivery"
        options={{
          title: 'Хүргэлт',
          href: hasActiveOrder ? undefined : null,
          tabBarIcon: ({ focused, color }) => <Ionicons name={iconName(focused, 'navigate', 'navigate-outline')} size={24} color={hasActiveOrder ? color : colors.textTertiary} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Орлого',
          tabBarIcon: ({ focused, color }) => <Ionicons name={iconName(focused, 'wallet', 'wallet-outline')} size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профайл',
          tabBarIcon: ({ focused, color }) => <Ionicons name={iconName(focused, 'person', 'person-outline')} size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
