'use client';

import { useEffect, useRef, useState } from 'react';
import type { FeeBreakdown } from '@/lib/cart-store';

interface DeliveryFeeParams {
  pickupStops: { supplierId?: string; lat?: number; lng?: number; district?: string }[];
  dropoff: { lat?: number; lng?: number; district?: string; address?: string };
  totalWeightKg?: number;
}

interface DeliveryFeeResult {
  fee: number;
  estimatedMinutes: number;
  breakdown: FeeBreakdown | null;
  fallback: boolean;
  isLoading: boolean;
}

const FALLBACK_FEE = 550_000;

export function useDeliveryFee(params: DeliveryFeeParams | null): DeliveryFeeResult {
  const [fee, setFee] = useState(FALLBACK_FEE);
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [breakdown, setBreakdown] = useState<FeeBreakdown | null>(null);
  const [fallback, setFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!params || params.pickupStops.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      try {
        const res = await fetch('/api/delivery-fee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: abortRef.current.signal,
        });
        const data = await res.json() as {
          fee?: number;
          estimatedMinutes?: number;
          breakdown?: FeeBreakdown | null;
          fallback?: boolean;
        };
        if (typeof data.fee !== 'number') throw new Error('fee-api-error');
        if (!res.ok && !data.fallback) throw new Error('fee-api-error');
        setFee(data.fee);
        setFallback(Boolean(data.fallback));
        setEstimatedMinutes(data.estimatedMinutes ?? 45);
        setBreakdown(data.breakdown ?? null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setFee(FALLBACK_FEE);
          setFallback(true);
          setBreakdown(null);
        }
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // Stringify params to avoid reference equality issues
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  return { fee, estimatedMinutes, breakdown, fallback, isLoading };
}
