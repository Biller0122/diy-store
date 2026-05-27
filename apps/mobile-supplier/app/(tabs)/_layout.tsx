import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

const C = {
  bg: '#08080E',
  primary: '#FF4500',
  textTertiary: '#55556A',
  red: '#EF4444',
};

const PENDING_COUNT = 4;

function TabBarIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  return (
    <Ionicons
      name={name}
      size={focused ? 24 : 22}
      color={color}
    />
  );
}

function OrdersIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View>
      <Ionicons name={focused ? 'bag' : 'bag-outline'} size={focused ? 24 : 22} color={color} />
      {PENDING_COUNT > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{PENDING_COUNT}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(8,8,14,0.97)',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Самбар',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'grid' : 'grid-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Захиалга',
          tabBarIcon: ({ color, focused }) => (
            <OrdersIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Бүтээгдэхүүн',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'cube' : 'cube-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профайл',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'person' : 'person-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: C.red,
    borderRadius: 99,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});
