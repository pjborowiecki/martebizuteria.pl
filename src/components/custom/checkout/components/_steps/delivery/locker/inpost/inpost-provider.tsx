import { createContext, useContext, useEffect, useMemo, useState, type JSX, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import { inpostQueryOptions } from "~/src/integrations/inpost/inpost.queries";
import type { InpostPointParsed } from "~/src/integrations/inpost/inpost.zod";

const SEARCH_DEBOUNCE_MS = 400;

export interface InpostContextValue {
  cityInput: string;
  hoveredPointId: string | undefined;
  isLoading: boolean;
  points: readonly InpostPointParsed[] | undefined;
  setCityInput: (value: string) => void;
  setHoveredPointId: (value: string | undefined) => void;
}

const InpostContext = createContext<InpostContextValue | undefined>(undefined);

export interface InpostProviderProps {
  readonly children: ReactNode;
  /**
   * City of an already-selected locker. Seeds the search so reopening the picker
   * restores the previous results (and selection) instead of an empty map.
   */
  readonly initialCity?: string;
}

export function InpostProvider({ children, initialCity = "" }: InpostProviderProps): JSX.Element {
  const [cityInput, setCityInput] = useState(initialCity);
  const [searchQuery, setSearchQuery] = useState(initialCity.trim());
  const [hoveredPointId, setHoveredPointId] = useState<string | undefined>();

  // Debounce the typed city into the actual search term. Each distinct term is
  // a distinct query key, so correcting the phrase fires a fresh, accurate
  // request rather than serving a stale cached list for the wrong city.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(cityInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(handle);
    };
  }, [cityInput]);

  const { data: points, isLoading } = useQuery(inpostQueryOptions.pointsByCity(searchQuery));

  const value = useMemo(
    () => ({
      cityInput,
      hoveredPointId,
      isLoading,
      points,
      setCityInput,
      setHoveredPointId
    }),
    [cityInput, hoveredPointId, isLoading, points]
  );

  return <InpostContext.Provider value={value}>{children}</InpostContext.Provider>;
}

export function useInpost(): InpostContextValue {
  const context = useContext(InpostContext);
  if (context === undefined) {
    throw new Error("useInpost must be used within a InpostProvider");
  }
  return context;
}
