import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { setShopSessionToken } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { useTheme, useThemeMode } from '@/lib/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  const token = useAppStore((state) => state.token);
  const C = useTheme();
  const mode = useThemeMode();

  useEffect(() => {
    setShopSessionToken(token);
  }, [token]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[slug]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="supplier/[slug]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="category/[slug]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="suppliers" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="products" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="how-to" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="cart" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="checkout" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="track/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="search" options={{ animation: 'fade' }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
