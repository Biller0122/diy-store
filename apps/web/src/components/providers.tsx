'use client';

import { ThemeProvider } from 'next-themes';
import { LazyMotion, domAnimation } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClientRef = useRef<QueryClient>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          retry: 1,
        },
      },
    });
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClientRef.current}>
        <LazyMotion features={domAnimation} strict>
          {children}
        </LazyMotion>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
