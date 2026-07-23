import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UrlFiltersState<T extends Record<string, string>> {
  filters: T;
  setFilter: (key: keyof T, value: string) => void;
  clearFilters: () => void;
}

export function useUrlFilters<T extends Record<string, string>>(
  defaults: T,
): UrlFiltersState<T> {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const param = searchParams.get(key as string);
    if (param !== null) {
      filters[key] = param as T[keyof T];
    }
  }

  const setFilter = useCallback(
    (key: keyof T, value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value && value !== defaults[key]) {
            next.set(key as string, value);
          } else {
            next.delete(key as string);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, defaults],
  );

  const clearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { filters, setFilter, clearFilters };
}
