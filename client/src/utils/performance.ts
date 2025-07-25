// Performance optimization utilities

import { useCallback, useRef, useEffect, useState } from 'react';

// Debounce hook for performance optimization
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

// Throttle hook for performance optimization
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCall = useRef<number>(0);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        callback(...args);
      }
    },
    [callback, delay]
  ) as T;

  return throttledCallback;
};

// Memoized selector hook for Redux performance
export const createMemoizedSelector = <T, R>(
  selector: (state: T) => R,
  equalityFn?: (left: R, right: R) => boolean
) => {
  let lastResult: R;
  let lastState: T;

  return (state: T): R => {
    if (state === lastState) {
      return lastResult;
    }

    const result = selector(state);
    if (equalityFn && lastResult !== undefined && equalityFn(lastResult, result)) {
      return lastResult;
    }

    lastState = state;
    lastResult = result;
    return result;
  };
};

// Virtual scrolling utility for large lists
export const useVirtualScroll = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) => {
  const visibleStart = Math.floor(window.scrollY / itemHeight);
  const visibleEnd = Math.min(
    itemCount,
    Math.ceil((window.scrollY + containerHeight) / itemHeight)
  );

  return {
    visibleStart,
    visibleEnd,
    totalHeight: itemCount * itemHeight,
    offsetY: visibleStart * itemHeight,
  };
};

// Image lazy loading utility
export const useLazyImage = (src: string, placeholder?: string) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView && !isLoaded) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.src = src;
    }
  }, [isInView, isLoaded, src]);

  return {
    ref: imgRef,
    src: isLoaded ? src : placeholder,
    isLoaded,
  };
};

// Performance monitoring
export const performanceMonitor = {
  mark: (name: string) => {
    if (performance.mark) {
      performance.mark(name);
    }
  },

  measure: (name: string, startMark: string, endMark?: string) => {
    if (performance.measure) {
      performance.measure(name, startMark, endMark);
    }
  },

  getMetrics: () => {
    if (performance.getEntriesByType) {
      return {
        navigation: performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming,
        paint: performance.getEntriesByType('paint'),
        resource: performance.getEntriesByType('resource'),
        measure: performance.getEntriesByType('measure'),
      };
    }
    return null;
  },

  reportWebVitals: () => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Type assertion for performance entries that have value property
        const performanceEntry = entry as any;
        console.log(`${entry.name}: ${performanceEntry.value || entry.duration || 'N/A'}`);
      }
    });
    
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (e) {
      // Browser doesn't support these metrics
    }
  },
};

// Bundle size optimization - dynamic imports
export const loadComponent = async (componentPath: string) => {
  try {
    const module = await import(componentPath);
    return module.default || module;
  } catch (error) {
    console.error(`Failed to load component: ${componentPath}`, error);
    throw error;
  }
};

// Memory optimization - cleanup utilities
export const useMemoryOptimization = () => {
  useEffect(() => {
    const cleanup = () => {
      // Clear any cached data that's no longer needed
      if ('caches' in window) {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            if (cacheName.includes('old') || cacheName.includes('temp')) {
              caches.delete(cacheName);
            }
          });
        });
      }
    };

    // Cleanup on page visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', cleanup);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', cleanup);
    };
  }, []);
};