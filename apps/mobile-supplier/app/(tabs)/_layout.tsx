import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#08080E',
  primary: '#FF4500',
  textTertiary: '#55556A',
};

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
    <Ionicons name={focused ? 'bag' : 'bag-outline'} size={focused ? 24 : 22} color={color} />
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
        name="revenue"
        options={{
          title: 'Орлого',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: 'Review',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'star' : 'star-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Тохиргоо',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name={focused ? 'settings' : 'settings-outline'}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
