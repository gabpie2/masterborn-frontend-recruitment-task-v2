// usePriceCalculation Hook
// Marcus: "This hook handles async price fetching. A bit janky but works."

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Configuration, Product, PriceBreakdown, PriceResponse } from '../components/ProductConfigurator/types';
import { calculatePrice } from '../services/api';

interface UsePriceCalculationResult {
  price: PriceBreakdown | null;
  formattedTotal: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook for managing price calculation
 *
 * BUG: Race condition - doesn't cancel or track outdated requests
 * When multiple rapid changes happen, responses can arrive out of order
 * causing the UI to show stale prices
 */
export function usePriceCalculation(
  config: Configuration | null,
  product: Product
): UsePriceCalculationResult {
  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [formattedTotal, setFormattedTotal] = useState<string>('$0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the latest request timestamp
  // BUG: This ref is used incorrectly - we're comparing timestamps but
  // the API returns a request ID (counter) not a timestamp
  const latestRequestRef = useRef<number>(0);

  const fetchPrice = useCallback(async () => {
    if (!config) {
      setPrice(null);
      setFormattedTotal('$0.00');
      return;
    }

    setIsLoading(true);
    setError(null);

    const requestTime = Date.now();
    latestRequestRef.current = requestTime;

    try {
      const response: PriceResponse = await calculatePrice(config, product);

      // BUG: This comparison is wrong - response.timestamp is a counter (requestId)
      // not a timestamp, so this check doesn't actually prevent race conditions
      // A request that started earlier might have a higher requestId if it finished later
      if (response.timestamp >= latestRequestRef.current) {
        setPrice(response.breakdown);
        setFormattedTotal(response.formattedTotal);
      }
      // Silently ignore "stale" responses (but the check above is broken)

    } catch {
      // Only set error if this is still the latest request
      if (requestTime === latestRequestRef.current) {
        setError('ERR_PRICE_CALC_FAILED');
        setPrice(null);
      }
    } finally {
      // BUG: Always sets loading to false, even for outdated requests
      // This can cause flickering where loading disappears then reappears
      setIsLoading(false);
    }
  }, [config, product]);

  // Fetch price when config changes
  // BUG: Missing dependency - fetchPrice changes on every config change
  // This works by accident but is fragile
  useEffect(() => {
    fetchPrice();
  }, [config?.selections, config?.addOns, config?.quantity]);

  return {
    price,
    formattedTotal,
    isLoading,
    error,
    refetch: fetchPrice,
  };
}

/**
 * Debounced version of price calculation
 *
 * BUG: Stale closure - the debounced function captures config at creation time
 * This means rapid changes might use outdated config values
 */
export function useDebouncedPriceCalculation(
  config: Configuration | null,
  product: Product,
  delay: number = 300
): UsePriceCalculationResult {
  const [price, setPrice] = useState<PriceBreakdown | null>(null);
  const [formattedTotal, setFormattedTotal] = useState<string>('$0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BUG: This ref captures config at the time of the effect, not when the
  // debounced function executes. This is a stale closure bug.
  const configRef = useRef(config);

  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!config) {
      setPrice(null);
      setFormattedTotal('$0.00');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // BUG: Using configRef.current instead of config directly
    // configRef won't be updated until after this effect runs
    timeoutRef.current = setTimeout(async () => {
      try {
        // BUG: Uses potentially stale config from ref
        const response = await calculatePrice(configRef.current!, product);
        setPrice(response.breakdown);
        setFormattedTotal(response.formattedTotal);
        setError(null);
      } catch {
        setError('ERR_PRICE_CALC_FAILED');
      } finally {
        setIsLoading(false);
      }
    }, delay);

    // Update ref AFTER setting up the timeout (this is the bug - should be before)
    configRef.current = config;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [config, product, delay]);

  const refetch = useCallback(() => {
    if (config) {
      setIsLoading(true);
      calculatePrice(config, product)
        .then(response => {
          setPrice(response.breakdown);
          setFormattedTotal(response.formattedTotal);
          setError(null);
        })
        .catch(() => {
          setError('ERR_PRICE_CALC_FAILED');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [config, product]);

  return {
    price,
    formattedTotal,
    isLoading,
    error,
    refetch,
  };
}
