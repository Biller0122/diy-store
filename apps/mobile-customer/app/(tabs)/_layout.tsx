import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useTheme, type ThemeColors } from '@/lib/theme';

function CartTabIcon({ focused, color }: { focused: boolean; color: string }) {
  const cartCount = useAppStore((s) => s.cartCount);
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.iconWrapper}>
      <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
      {cartCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const C = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.tabBar,
          borderTopColor: C.tabBarBorder,
          height: 84,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Нүүр',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Ангилал',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Бүртгэл',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Сагс',
          tabBarIcon: ({ focused, color }) => (
            <CartTabIcon focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null,
          title: 'Хайх',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          href: null,
          title: 'Захиалга',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const makeStyles = (C: ThemeColors) =>
  StyleSheet.create({
    iconWrapper: {
      position: 'relative',
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -6,
      backgroundColor: C.accent,
      borderRadius: 10,
      minWidth: 18,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: '#fff',
      fontSize: 9,
      fontWeight: '700',
    },
  });
