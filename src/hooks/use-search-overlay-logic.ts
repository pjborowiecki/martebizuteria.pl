"use client";

import { type ChangeEvent, type KeyboardEvent, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTranslations } from "use-intl";
import { useShallow } from "zustand/react/shallow";

import { gsap, useGSAP } from "~/src/lib/gsap";

import { useNavigationStore } from "~/src/components/custom/landing-page/navigation/store/navigation-store";

const ZERO_RESULTS = 0;
const FOCUS_TIMEOUT_MS = 300;

export interface SearchResult {
  detail?: string;
  href: string;
  image?: string;
  name: string;
  type: "category" | "collection" | "page" | "product";
}

const PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1588444837495-c6cfeb53ae8d?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1603561596112-db8bc2aa93e2?auto=format&fit=crop&w=400&q=80"
];

const CATEGORY_IMAGES: Record<string, string> = {
  bracelets: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=400&q=80",
  chokers: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=400&q=80",
  earrings: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80",
  necklaces: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80",
  pendants: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=400&q=80",
  rings: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=400&q=80"
};

const COLLECTION_IMAGES: Record<string, string> = {
  bestsellers: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=400&q=80",
  giftEdit: "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=400&q=80",
  newArrivals: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=400&q=80"
};

export const TRENDING_KEYS = ["earrings", "silver", "newArrivals", "rings", "giftEdit"] as const;

const TOTAL_ITEMS = 12;
const INDEX_OFFSET = 1;
const ITEM_KEYS = Array.from({ length: TOTAL_ITEMS }, (_, i) => `item${i + INDEX_OFFSET}`);
const CATEGORY_KEYS = ["earrings", "necklaces", "bracelets", "rings", "chokers", "pendants"] as const;
const COLLECTION_KEYS = ["newArrivals", "bestsellers", "giftEdit"] as const;

const PRODUCT_SLUG_MAP: Record<string, string> = {
  item1: "aura-hoop-i",
  item10: "horizon-bangle",
  item11: "veil-choker",
  item12: "nova-ear-cuff",
  item2: "lune-drop",
  item3: "contour-stud",
  item4: "arc-cuff",
  item5: "pebble-thread",
  item6: "forma-ii",
  item7: "silhouette-ring",
  item8: "meridian-chain",
  item9: "eclipse-pendant"
};

const CATEGORY_SLUG_MAP: Record<string, string> = {
  bracelets: "bransoletki",
  chokers: "kolczyki",
  earrings: "kolczyki",
  necklaces: "naszyjniki",
  pendants: "naszyjniki",
  rings: "pierscionki"
};

const COLLECTION_SLUG_MAP: Record<string, string> = {
  bestsellers: "bestsellery",
  giftEdit: "prezenty",
  newArrivals: "nowosci"
};

const PAGES = [
  { href: "#marka", nameKey: "brand" },
  { href: "/products", nameKey: "allProducts" }
] as const;

function useAllItems(tp: (key: string) => string, t: (key: string) => string) {
  return useMemo<SearchResult[]>(() => {
    const products: SearchResult[] = ITEM_KEYS.map((key, i) => ({
      detail: tp(`products.${key}.category`),
      href: `/products/${PRODUCT_SLUG_MAP[key] ?? key}`,
      image: PRODUCT_IMAGES[i],
      name: tp(`products.${key}.name`),
      type: "product"
    }));

    const categories: SearchResult[] = CATEGORY_KEYS.map((key) => ({
      href: `/categories/${CATEGORY_SLUG_MAP[key] ?? key}`,
      image: CATEGORY_IMAGES[key],
      name: tp(`categories.${key}`),
      type: "category"
    }));

    const collections: SearchResult[] = COLLECTION_KEYS.map((key) => ({
      href: `/collections/${COLLECTION_SLUG_MAP[key] ?? key}`,
      image: COLLECTION_IMAGES[key],
      name: tp(`collections.${key}`),
      type: "collection"
    }));

    const pages: SearchResult[] = PAGES.map((p) => ({
      href: p.href,
      name: t(`searchOverlay.pages.${p.nameKey}`),
      type: "page"
    }));

    return [...products, ...categories, ...collections, ...pages];
  }, [tp, t]);
}

function normalize(str: string): string {
  return str.toLowerCase().replaceAll(/[^a-z0-9\s]/g, "");
}

export function useSearchOverlayLogic(overlayRef: RefObject<HTMLDialogElement | null>, inputRef: RefObject<HTMLInputElement | null>) {
  const t = useTranslations("components.custom.navigation");
  const tp = useTranslations("productsPage");

  const { searchOpen, setSearchOpen } = useNavigationStore(
    useShallow((s) => ({ searchOpen: s.searchOpen, setSearchOpen: s.setSearchOpen }))
  );

  const [query, setQuery] = useState("");
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const allItems = useAllItems(tp, t);

  const filtered = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      return [];
    }
    const q = normalize(query);
    return allItems.filter((item) => {
      const haystack = normalize(`${item.name} ${item.detail ?? ""} ${item.type}`);
      return haystack.includes(q);
    });
  }, [query, allItems]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const item of filtered) {
      const key = item.type;
      groups[key] ??= [];
      groups[key]?.push(item);
    }
    return groups;
  }, [filtered]);

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

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        setQuery("");
        return;
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(!searchOpen);
        if (searchOpen) {
          setQuery("");
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [searchOpen, setSearchOpen]);

  const handleClose = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
  }, [setSearchOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        handleClose();
      }
    },
    [handleClose]
  );

  const hasResults = filtered.length > ZERO_RESULTS;
  const showTrending = query.trim() === "";

  const handleQueryChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleClearQuery = useCallback(() => {
    setQuery("");
  }, []);

  const handleTrendingClick = useCallback(
    (key: string) => {
      setQuery(t(`searchOverlay.trendingItems.${key}`));
    },
    [setQuery, t]
  );

  return {
    filtered,
    grouped,
    handleClearQuery,
    handleClose,
    handleKeyDown,
    handleQueryChange,
    handleTrendingClick,
    hasResults,
    query,
    searchOpen,
    showTrending
  };
}
