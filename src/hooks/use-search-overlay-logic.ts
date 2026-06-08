import { type ChangeEvent, type KeyboardEvent, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "use-intl";
import { useShallow } from "zustand/react/shallow";

import { CONSTANTS } from "~/src/constants";

import { gsap, useGSAP } from "~/src/lib/gsap";

import { useNavigationStore } from "~/src/components/custom/pages/landing-page/navigation/store/navigation-store";

import { useDebounce } from "~/src/hooks/use-debounce";
import { STOREFRONT_SEARCH_DEBOUNCE_MS, STOREFRONT_SEARCH_MIN_LENGTH } from "~/src/modules/storefront-search/storefront-search.constants";
import { storefrontSearchQueryOptions } from "~/src/modules/storefront-search/storefront-search.queries";
import type { StorefrontSearchResultItem } from "~/src/modules/storefront-search/storefront-search.types";

const ZERO_RESULTS = 0;
const FOCUS_TIMEOUT_MS = 300;

export interface SearchResult {
  detail?: string;
  href: string;
  image?: string;
  name: string;
  type: "category" | "collection" | "page" | "product";
}

const STATIC_PAGES = [
  { href: CONSTANTS.ROUTES.ABOUT, nameKey: "brand" },
  { href: CONSTANTS.ROUTES.PRODUCTS, nameKey: "allProducts" }
] as const;

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll(/[^a-z0-9\s]/gu, "");
}

function toSearchHref(item: StorefrontSearchResultItem): string {
  switch (item.type) {
    case "category": {
      return `/categories/${item.handle}`;
    }
    case "collection": {
      return `/collections/${item.handle}`;
    }
    case "page": {
      return CONSTANTS.ROUTES.PRODUCTS;
    }
    case "product": {
      return `/products/${item.handle}`;
    }
  }
}

function mapServerItem(item: StorefrontSearchResultItem): SearchResult {
  return {
    detail: item.detail,
    href: toSearchHref(item),
    image: item.image,
    name: item.name,
    type: item.type
  };
}

function filterStaticPages(query: string, t: (key: string) => string): SearchResult[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery === "") {
    return [];
  }

  return STATIC_PAGES.flatMap((page) => {
    const name = t(`searchOverlay.pages.${page.nameKey}`);
    const haystack = normalize(name);
    if (!haystack.includes(normalizedQuery)) {
      return [];
    }

    return [
      {
        href: page.href,
        name,
        type: "page"
      } satisfies SearchResult
    ];
  });
}

function useSearchOverlayAnimation(
  overlayRef: RefObject<HTMLDialogElement | null>,
  inputRef: RefObject<HTMLInputElement | null>,
  searchOpen: boolean
) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      if (!overlayRef.current) {
        return;
      }

      const tl = gsap.timeline({ paused: true });

      tl.set(overlayRef.current, { display: "flex" });
      tl.fromTo(
        overlayRef.current,
        { clipPath: "inset(0 0 100% 0)" },
        { clipPath: "inset(0 0 0% 0)", duration: 0.55, ease: "power4.inOut" }
      );
      tl.fromTo(".search-bar", { autoAlpha: 0, y: -20 }, { autoAlpha: 1, duration: 0.4, ease: "power2.out", y: 0 }, "-=0.15");
      tl.fromTo(".search-content", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, duration: 0.4, ease: "power2.out", y: 0 }, "-=0.2");

      timelineRef.current = tl;
    },
    { scope: overlayRef }
  );

  useEffect(() => {
    const tl = timelineRef.current;
    if (!tl) {
      return;
    }

    if (searchOpen) {
      tl.play();
      const input = inputRef.current;
      setTimeout(() => input?.focus(), FOCUS_TIMEOUT_MS);
    } else {
      tl.reverse();
    }
  }, [searchOpen, inputRef]);
}

function useSearchOverlayKeyboard(searchOpen: boolean, onClose: () => void, onToggle: () => void) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) {
        onClose();
        return;
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onToggle();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, onToggle, searchOpen]);
}

export function useSearchOverlayLogic(overlayRef: RefObject<HTMLDialogElement | null>, inputRef: RefObject<HTMLInputElement | null>) {
  const t = useTranslations("components.custom.navigation");
  const locale = useLocale();

  const { searchOpen, setSearchOpen } = useNavigationStore(
    useShallow((s) => ({ searchOpen: s.searchOpen, setSearchOpen: s.setSearchOpen }))
  );

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), STOREFRONT_SEARCH_DEBOUNCE_MS);
  const searchEnabled = debouncedQuery.length >= STOREFRONT_SEARCH_MIN_LENGTH;

  const { data: searchResults, isFetching: isSearchFetching } = useQuery({
    ...storefrontSearchQueryOptions.resultsQueryOptions(debouncedQuery, locale),
    enabled: searchEnabled
  });

  const { data: trendingItems = [] } = useQuery(storefrontSearchQueryOptions.trendingQueryOptions(locale));

  const filtered = useMemo<SearchResult[]>(() => {
    if (!searchEnabled) {
      return [];
    }

    const serverItems = [
      ...(searchResults?.products ?? []),
      ...(searchResults?.categories ?? []),
      ...(searchResults?.collections ?? [])
    ].map((item) => mapServerItem(item));

    return [...serverItems, ...filterStaticPages(debouncedQuery, t)];
  }, [debouncedQuery, searchEnabled, searchResults, t]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const item of filtered) {
      const key = item.type;
      groups[key] ??= [];
      groups[key]?.push(item);
    }
    return groups;
  }, [filtered]);

  const handleClose = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
  }, [setSearchOpen]);

  const handleToggle = useCallback(() => {
    setSearchOpen(!searchOpen);
    if (searchOpen) {
      setQuery("");
    }
  }, [searchOpen, setSearchOpen]);

  useSearchOverlayAnimation(overlayRef, inputRef, searchOpen);
  useSearchOverlayKeyboard(searchOpen, handleClose, handleToggle);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        handleClose();
      }
    },
    [handleClose]
  );

  const hasQuery = query.trim().length > ZERO_RESULTS;
  const hasResults = filtered.length > ZERO_RESULTS;
  const showTrending = !hasQuery;
  const isSearching = hasQuery && (query.trim() !== debouncedQuery || (searchEnabled && isSearchFetching));

  return {
    debouncedQuery,
    filtered,
    grouped,
    handleClearQuery: () => {
      setQuery("");
    },
    handleClose,
    handleKeyDown,
    handleQueryChange: (e: ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
    },
    hasQuery,
    hasResults,
    isSearching,
    query,
    searchOpen,
    showTrending,
    trendingItems
  };
}
