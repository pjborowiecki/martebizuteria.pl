import { type JSX, type ReactNode, useCallback, useMemo, useRef } from "react";

import { ArrowRight, Search, X } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { cn } from "~/src/lib/utils";

import { Separator } from "~/src/components/shadcn/separator";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";
import { useNavigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider";

import { TRENDING_KEYS, type SearchResult, useSearchOverlayLogic } from "~/src/hooks/use-search-overlay-logic";

const rowClassName =
  "group flex items-center gap-4 border-b border-border/40 py-3.5 transition-colors last:borde r-b-0 hover:bg-secondary/30 lg:gap-5 lg:py-4";

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

  return (
    <SearchResultLinkTarget href={href} onPathClick={handlePathClick}>
      {children}
    </SearchResultLinkTarget>
  );
}

function SearchResultLinkTarget({
  href,
  onPathClick,
  children
}: Readonly<{
  href: string;
  onPathClick: () => void;
  children: ReactNode;
}>): JSX.Element {
  const productMatch = /^\/products\/([^/]+)$/u.exec(href);
  const categoryMatch = /^\/categories\/([^/]+)$/u.exec(href);
  const collectionMatch = /^\/collections\/([^/]+)$/u.exec(href);

  const MATCH_INDEX = 1;
  const handle1 = productMatch?.[MATCH_INDEX] ?? "";
  const paramsProduct = useMemo(() => ({ handle: handle1 }), [handle1]);

  const handle2 = categoryMatch?.[MATCH_INDEX] ?? "";
  const paramsCategory = useMemo(() => ({ handle: handle2 }), [handle2]);

  const handle3 = collectionMatch?.[MATCH_INDEX] ?? "";
  const paramsCollection = useMemo(() => ({ handle: handle3 }), [handle3]);

  if (productMatch) {
    return (
      <LocalizedLink className={rowClassName} params={paramsProduct} to={CONSTANTS.ROUTES.PRODUCT} onClick={onPathClick}>
        {children}
      </LocalizedLink>
    );
  }

  if (categoryMatch) {
    return (
      <LocalizedLink className={rowClassName} params={paramsCategory} to={CONSTANTS.ROUTES.CATEGORY} onClick={onPathClick}>
        {children}
      </LocalizedLink>
    );
  }

  if (collectionMatch) {
    return (
      <LocalizedLink className={rowClassName} params={paramsCollection} to={CONSTANTS.ROUTES.COLLECTION} onClick={onPathClick}>
        {children}
      </LocalizedLink>
    );
  }

  return (
    <LocalizedLink className={rowClassName} to={CONSTANTS.ROUTES.PRODUCTS} onClick={onPathClick}>
      {children}
    </LocalizedLink>
  );
}

function SearchResultItem({
  item,
  onNavigate
}: Readonly<{
  item: SearchResult;
  onNavigate: () => void;
}>): JSX.Element {
  return (
    <SearchResultLink href={item.href} onNavigate={onNavigate}>
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
          <p className="mt-0.5 truncate text-[11px] tracking-[0.15em] text-muted-foreground uppercase">{item.detail}</p>
        )}
      </div>
      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground"
        strokeWidth={1.2}
      />
    </SearchResultLink>
  );
}

const MAX_RESULTS_PER_GROUP = 6;
const ZERO_RESULTS = 0;
const SLICE_START = 0;

function SearchResultGroup({
  type,
  items,
  onNavigate
}: Readonly<{
  type: string;
  items: SearchResult[];
  onNavigate: () => void;
}>): JSX.Element {
  const t = useTranslations("components.custom.navigation");

  const sectionLabel = (tType: string) => {
    const map: Record<string, string> = {
      category: t("searchOverlay.sectionCategories"),
      collection: t("searchOverlay.sectionCollections"),
      page: t("searchOverlay.sectionPages"),
      product: t("searchOverlay.sectionProducts")
    };
    return map[tType] ?? tType;
  };

  return (
    <section>
      <p className="mb-4 text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{sectionLabel(type)}</p>
      <div className="grid gap-px">
        {items.slice(SLICE_START, MAX_RESULTS_PER_GROUP).map((item) => (
          <SearchResultItem key={item.href + item.name} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  );
}

function ViewAllLink({ onClick }: Readonly<{ onClick: () => void }>): JSX.Element {
  const t = useTranslations("components.custom.navigation");
  return (
    <div className="pt-2 text-center">
      <LocalizedLink
        to={CONSTANTS.ROUTES.PRODUCTS}
        onClick={onClick}
        className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        {t("searchOverlay.viewAll")}
        <ArrowRight className="size-3.5" strokeWidth={1.2} />
      </LocalizedLink>
    </div>
  );
}

export function SearchOverlay(): JSX.Element {
  const t = useTranslations("components.custom.navigation");

  const overlayRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
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
  } = useSearchOverlayLogic(overlayRef, inputRef);

  const styleMemo = useMemo(() => ({ clipPath: "inset(0 0 100% 0)" }), []);

  return (
    <dialog
      ref={overlayRef}
      className="fixed inset-0 z-300 m-0 hidden h-dvh max-h-none w-screen max-w-none flex-col border-none bg-background/98 p-0 text-foreground backdrop-blur-xl"
      style={styleMemo}
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
                  return items !== undefined && items.length > ZERO_RESULTS;
                })
                .map((type) => {
                  const items = grouped[type];
                  return <SearchResultGroup key={type} type={type} items={items} onNavigate={handleClose} />;
                })}

              {filtered.length > MAX_RESULTS_PER_GROUP && <ViewAllLink onClick={handleClose} />}
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
