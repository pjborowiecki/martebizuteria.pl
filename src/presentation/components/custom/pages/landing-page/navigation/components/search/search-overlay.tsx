import { type JSX, useCallback, useMemo, useRef } from "react"

import { ArrowRight, Loader2, Search, X } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { useNavigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider"
import {
  type SearchResult,
  useSearchOverlayLogic,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-search-overlay-logic"

import { ROUTES } from "~/src/routes"

const TrendingQuickLink = ({
  item,
  onNavigate,
}: Readonly<{
  item: StorefrontSearch["trendingItem"]
  onNavigate: () => void
}>): JSX.Element => {
  const params = useMemo(() => ({ handle: item.handle }), [item.handle])
  const route = item.type === "category" ? ROUTES.CATEGORY : ROUTES.COLLECTION

  return (
    <LocalizedLink className={trendingChipClassName} params={params} to={route} onClick={onNavigate}>
      {item.label}
    </LocalizedLink>
  )
}

const SearchResultItem = ({
  item,
  onNavigate,
}: Readonly<{
  item: SearchResult
  onNavigate: () => void
}>): JSX.Element => {
  const { dismissMenuForRouteNavigation } = useNavigation()
  const handleNavigate = useCallback(() => {
    dismissMenuForRouteNavigation()
    onNavigate()
  }, [dismissMenuForRouteNavigation, onNavigate])

  return (
    <LocalizedLink className={rowClassName} to={item.to} params={item.params} onClick={handleNavigate}>
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
    </LocalizedLink>
  )
}

const SearchResultGroup = ({
  type,
  items,
  onNavigate,
}: Readonly<{
  type: SearchResult["type"]
  items: SearchResult[]
  onNavigate: () => void
}>): JSX.Element => {
  const t = useTranslations("components.custom.navigation")
  const sectionLabels: Record<SearchResult["type"], string> = {
    category: t("searchOverlay.sectionCategories"),
    collection: t("searchOverlay.sectionCollections"),
    page: t("searchOverlay.sectionPages"),
    product: t("searchOverlay.sectionProducts"),
  }

  return (
    <section>
      <p className="mb-4 text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{sectionLabels[type]}</p>
      <div className="grid gap-px">
        {items.slice(0, MAX_RESULTS_PER_GROUP).map((item) => (
          <SearchResultItem key={`${item.type}:${item.params?.handle ?? item.to}`} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  )
}

const ViewAllLink = ({
  onClick,
  query,
}: Readonly<{
  onClick: () => void
  query: string
}>): JSX.Element => {
  const t = useTranslations("components.custom.navigation")
  const search = useMemo(() => ({ q: query }), [query])

  return (
    <div className="pt-2 text-center">
      <LocalizedLink
        to={ROUTES.PRODUCTS}
        search={search}
        onClick={onClick}
        className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        {t("searchOverlay.viewAll")}
        <ArrowRight className="size-3.5" strokeWidth={1.2} />
      </LocalizedLink>
    </div>
  )
}

export const SearchOverlay = (): JSX.Element => {
  const t = useTranslations("components.custom.navigation")
  const overlayRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    debouncedQuery,
    filtered,
    grouped,
    handleClearQuery,
    handleClose,
    handleQueryChange,
    hasQuery,
    hasResults,
    isSearching,
    query,
    searchOpen,
    showTrending,
    trendingItems,
  } = useSearchOverlayLogic(overlayRef, inputRef)

  const resultGroups = RESULT_GROUP_ORDER.map((type) => ({
    items: grouped[type] ?? [],
    type,
  })).filter((group) => group.items.length > 0)

  return (
    <dialog
      ref={overlayRef}
      className="fixed inset-0 z-300 m-0 hidden h-dvh max-h-none w-screen max-w-none flex-col border-none bg-background/98 p-0 text-foreground backdrop-blur-xl"
      style={OVERLAY_STYLE}
      aria-modal={searchOpen}
      aria-label={t("search")}
    >
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

      <div className="search-bar mx-auto w-full max-w-400 px-6 pt-10 pb-8 lg:px-12 lg:pt-16 lg:pb-10">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-0 size-5 -translate-y-1/2 text-muted-foreground/60 lg:size-6"
            strokeWidth={1.2}
          />
          <input
            ref={inputRef}
            type="search"
            aria-label={t("searchOverlay.placeholder")}
            value={query}
            onChange={handleQueryChange}
            placeholder={t("searchOverlay.placeholder")}
            className="w-full border-b border-transparent bg-transparent py-3 pr-10 pl-9 font-serif text-3xl text-foreground placeholder:text-muted-foreground/40 focus:border-foreground/20 focus:outline-none lg:pl-11 lg:text-5xl"
            autoComplete="off"
            spellCheck={false}
          />
          {isSearching && (
            <Loader2
              className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
              strokeWidth={1.5}
            />
          )}
          {query && !isSearching && (
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

      <div className="search-content flex-1 overflow-y-auto">
        <div className="mx-auto max-w-400 px-6 pb-20 lg:px-12">
          {showTrending && (
            <div className="space-y-6">
              <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("searchOverlay.trending")}</p>
              <div className="flex flex-wrap gap-3">
                {trendingItems.map((item) => (
                  <TrendingQuickLink key={`${item.type}-${item.handle}`} item={item} onNavigate={handleClose} />
                ))}
              </div>
            </div>
          )}

          {hasQuery && isSearching && (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
              <span>{t("searchOverlay.searching")}</span>
            </div>
          )}

          {hasQuery && !isSearching && !hasResults && (
            <div className="py-12 text-center">
              <p className="font-serif text-xl">{t("searchOverlay.noResults")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("searchOverlay.noResultsHint")}</p>
            </div>
          )}

          {hasResults && !isSearching && (
            <div className="space-y-10">
              {resultGroups.map(({ items, type }) => (
                <SearchResultGroup key={type} type={type} items={items} onNavigate={handleClose} />
              ))}

              {filtered.length > MAX_RESULTS_PER_GROUP && debouncedQuery && <ViewAllLink onClick={handleClose} query={debouncedQuery} />}
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}

const rowClassName =
  "group flex items-center gap-4 border-b border-border/40 py-3.5 transition-colors last:border-b-0 hover:bg-secondary/30 lg:gap-5 lg:py-4"

const trendingChipClassName =
  "rounded-full border border-border/80 px-5 py-2.5 text-[11px] tracking-[0.12em] text-muted-foreground transition-all hover:border-foreground hover:text-foreground"

const MAX_RESULTS_PER_GROUP = 6

const RESULT_GROUP_ORDER = ["product", "category", "collection", "page"] as const

const OVERLAY_STYLE = { clipPath: "inset(0 0 100% 0)" }
