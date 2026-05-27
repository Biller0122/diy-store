import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSupplierStore } from '@/lib/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function AuthGuard() {
  const supplier = useSupplierStore((s) => s.supplier);
  const hydrate = useSupplierStore((s) => s.hydrate);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    const inTabsGroup = segments[0] === '(tabs)';
    const inLogin = segments[0] === 'login';

    if (!supplier && !inLogin) {
      router.replace('/login');
    } else if (supplier && inLogin) {
      router.replace('/(tabs)');
    }
  }, [supplier, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[id]" />
      </Stack>
    </QueryClientProvider>
  );
}
