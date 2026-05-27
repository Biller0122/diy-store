import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#08080E' } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[slug]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="supplier/[slug]" options={{ animation: 'slide_from_right' }} />
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
