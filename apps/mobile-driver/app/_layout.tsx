import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useDriverStore } from '../lib/store';

function AuthGuard() {
  const { driver } = useDriverStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === 'login';
    if (!driver && !inAuthGroup) {
      router.replace('/login');
    } else if (driver && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [driver, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f0f1a' } }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
