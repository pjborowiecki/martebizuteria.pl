"use client";

import { type JSX, type KeyboardEvent, type ReactNode, type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowRight, Search, X } from "lucide-react";
import { useTranslations } from "use-intl";
import { useShallow } from "zustand/react/shallow";

import { gsap, useGSAP } from "~/src/lib/gsap";
import { cn } from "~/src/lib/utils";

import { Separator } from "~/src/components/shadcn/separator";

import { Image } from "~/src/components/custom/image";
import { useNavigation } from "~/src/components/custom/landing/navigation/components/navigation/navigation-provider";
import { useNavigationStore } from "~/src/components/custom/landing/navigation/store/navigation-store";
import { LocalizedLink } from "~/src/components/custom/localized-link";

interface SearchResult {
  type: "product" | "category" | "collection" | "page";
  name: string;
  detail?: string;
  image?: string;
  href: string;
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

const ITEM_KEYS = Array.from({ length: 12 }, (_, i) => `item${i + 1}`);
const CATEGORY_KEYS = ["earrings", "necklaces", "bracelets", "rings", "chokers", "pendants"] as const;
const COLLECTION_KEYS = ["newArrivals", "bestsellers", "giftEdit"] as const;
const TRENDING_KEYS = ["earrings", "silver", "newArrivals", "rings", "giftEdit"] as const;

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

function normalize(str: string): string {
  return str.toLowerCase().replaceAll(/[^a-z0-9\s]/g, "");
}

const rowClassName =
  "group flex items-center gap-4 border-b border-border/40 py-3.5 transition-colors last:border-b-0 hover:bg-secondary/30 lg:gap-5 lg:py-4";

function TrendingTag({ tagKey, onClick }: Readonly<{ tagKey: string; onClick: (key: string) => void }>) {
  const t = useTranslations("components.custom.navigation");
  const handleClick = useCallback(() => {
    onClick(tagKey);
  }, [onClick, tagKey]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-full border border-border/80 px-5 py-2.5 text-[11px] tracking-[0.18em] text-muted-foreground uppercase transition-all hover:border-foreground hover:text-foreground"
    >
      {t(`searchOverlay.trendingItems.${tagKey}`)}
    </button>
  );
}

function SearchResultLink({
  href,
  onNavigate,
  children
}: Readonly<{
  href: string;
  onNavigate: () => void;
  children: ReactNode;
}>): JSX.Element {
  const { handleNavigateToHash } = useNavigation();

  const handleHashClick = useCallback(() => {
    onNavigate();
    handleNavigateToHash(href);
  }, [onNavigate, handleNavigateToHash, href]);

  const handlePathClick = useCallback(() => {
    onNavigate();
  }, [onNavigate]);

  if (href.startsWith("#")) {
    return (
      <button
        type="button"
        className={cn(rowClassName, "w-full cursor-pointer border-0 bg-transparent p-0 text-left outline-none")}
        onClick={handleHashClick}
      >
        {children}
      </button>
    );
  }

  const productMatch = /^\/products\/([^/]+)$/.exec(href);
  if (productMatch) {
    return (
      <LocalizedLink className={rowClassName} params={{ handle: productMatch[1] }} to="/products/$handle" onClick={handlePathClick}>
        {children}
      </LocalizedLink>
    );
  }

  const categoryMatch = /^\/categories\/([^/]+)$/.exec(href);
  if (categoryMatch) {
    return (
      <LocalizedLink className={rowClassName} params={{ handle: categoryMatch[1] }} to="/categories/$handle" onClick={handlePathClick}>
        {children}
      </LocalizedLink>
    );
  }

  const collectionMatch = /^\/collections\/([^/]+)$/.exec(href);
  if (collectionMatch) {
    return (
      <LocalizedLink className={rowClassName} params={{ handle: collectionMatch[1] }} to="/collections/$handle" onClick={handlePathClick}>
        {children}
      </LocalizedLink>
    );
  }

  if (href === "/products") {
    return (
      <LocalizedLink className={rowClassName} to="/products" onClick={handlePathClick}>
        {children}
      </LocalizedLink>
    );
  }

  return (
    <LocalizedLink className={rowClassName} to="/products" onClick={handlePathClick}>
      {children}
    </LocalizedLink>
  );
}

export function SearchOverlay(): JSX.Element {
  const t = useTranslations("components.custom.navigation");
  const tp = useTranslations("productsPage");

  const { searchOpen, setSearchOpen } = useNavigationStore(
    useShallow((s) => ({ searchOpen: s.searchOpen, setSearchOpen: s.setSearchOpen }))
  );

  const [query, setQuery] = useState("");
  const overlayRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const allItems = useMemo<SearchResult[]>(() => {
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

  const sectionLabel = useCallback(
    (type: string) => {
      const map: Record<string, string> = {
        category: t("searchOverlay.sectionCategories"),
        collection: t("searchOverlay.sectionCollections"),
        page: t("searchOverlay.sectionPages"),
        product: t("searchOverlay.sectionProducts")
      };
      return map[type] ?? type;
    },
    [t]
  );

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
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      tl.reverse();
    }
  }, [searchOpen]);

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

  const hasResults = filtered.length > 0;
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

  return (
    <dialog
      ref={overlayRef}
      className="fixed inset-0 z-300 m-0 hidden h-dvh max-h-none w-screen max-w-none flex-col border-none bg-background/98 p-0 text-foreground backdrop-blur-xl"
      style={{ clipPath: "inset(0 0 100% 0)" }}
      aria-modal={searchOpen}
      aria-label={t("search")}
    >
      {/* Top bar */}
      <div className="mx-auto flex w-full max-w-400 items-center justify-between px-6 py-5 lg:px-12">
        <p className="font-serif text-sm tracking-wide">{t("brand")}</p>
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {t("searchOverlay.close")}
          <X className="size-4" strokeWidth={1.2} />
        </button>
      </div>

      <Separator className="bg-border/50" />

      {/* Search input */}
      <div className="search-bar mx-auto w-full max-w-400 px-6 pt-10 pb-8 lg:px-12 lg:pt-16 lg:pb-10">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-0 size-5 -translate-y-1/2 text-muted-foreground/60 lg:size-6"
            strokeWidth={1.2}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder={t("searchOverlay.placeholder")}
            className="w-full border-b border-transparent bg-transparent py-3 pr-4 pl-9 font-serif text-3xl text-foreground placeholder:text-muted-foreground/40 focus:border-foreground/20 focus:outline-none lg:pl-11 lg:text-5xl"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              onClick={handleClearQuery}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="search-content flex-1 overflow-y-auto">
        <div className="mx-auto max-w-400 px-6 pb-20 lg:px-12">
          {/* Trending / empty state */}
          {showTrending && (
            <div className="space-y-6">
              <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("searchOverlay.trending")}</p>
              <div className="flex flex-wrap gap-3">
                {TRENDING_KEYS.map((key) => (
                  <TrendingTag key={key} tagKey={key} onClick={handleTrendingClick} />
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {!showTrending && !hasResults && (
            <div className="py-12 text-center">
              <p className="font-serif text-xl">{t("searchOverlay.noResults")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("searchOverlay.noResultsHint")}</p>
            </div>
          )}

          {/* Grouped results */}
          {hasResults && (
            <div className="space-y-10">
              {(["product", "category", "collection", "page"] as const)
                .filter((type) => {
                  const items = grouped[type];
                  return items !== undefined && items.length > 0;
                })
                .map((type) => {
                  const items = grouped[type];
                  return (
                    <section key={type}>
                      <p className="mb-4 text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{sectionLabel(type)}</p>
                      <div className="grid gap-px">
                        {items.slice(0, 6).map((item) => (
                          <SearchResultLink key={item.href + item.name} href={item.href} onNavigate={handleClose}>
                            {item.image !== undefined && (
                              <div className="relative size-14 shrink-0 overflow-hidden bg-secondary lg:size-16">
                                <Image
                                  alt=""
                                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                  height={128}
                                  sizes="64px"
                                  src={item.image}
                                  width={128}
                                />
                              </div>
                            )}
                            {item.image === undefined && <div className="size-14 shrink-0 lg:size-16" />}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-serif text-base tracking-wide lg:text-lg">{item.name}</p>
                              {item.detail !== undefined && (
                                <p className="mt-0.5 truncate text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
                                  {item.detail}
                                </p>
                              )}
                            </div>
                            <ArrowRight
                              className="size-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground"
                              strokeWidth={1.2}
                            />
                          </SearchResultLink>
                        ))}
                      </div>
                    </section>
                  );
                })}

              {filtered.length > 6 && (
                <div className="pt-2 text-center">
                  <LocalizedLink
                    to="/products"
                    onClick={handleClose}
                    className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
                  >
                    {t("searchOverlay.viewAll")}
                    <ArrowRight className="size-3.5" strokeWidth={1.2} />
                  </LocalizedLink>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
