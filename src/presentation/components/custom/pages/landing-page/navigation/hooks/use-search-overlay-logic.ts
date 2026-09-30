import { type ChangeEvent, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl/react"
import { useShallow } from "zustand/react/shallow"

import { gsap, useGSAP } from "~/src/integrations/gsap/gsap.config"

import { STOREFRONT_SEARCH_DEBOUNCE_MS, STOREFRONT_SEARCH_MIN_LENGTH } from "~/src/modules/storefront-search/storefront-search.constants"
import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"
import { getTrendingSearchesQuery } from "~/src/modules/storefront-search/use-cases/get-trending-searches"
import { searchStorefrontQuery } from "~/src/modules/storefront-search/use-cases/search-storefront"

import { useDebounce } from "~/src/hooks/use-debounce"

import { type LocalizedTo } from "~/src/presentation/components/custom/localized-link"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

import { ROUTES } from "~/src/routes"

const normalize = (str: string): string =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll(/[^a-z0-9\s]/gu, "")
const mapServerItem = (item: StorefrontSearch["resultItem"]): SearchResult => ({
  detail: item.detail,
  image: item.image,
  name: item.name,
  params:
    item.type === "page"
      ? undefined
      : {
          handle: item.handle,
        },
  to: SEARCH_RESULT_ROUTES[item.type],
  type: item.type,
})

const filterStaticPages = (query: string, t: (key: string) => string): SearchResult[] => {
  const normalizedQuery = normalize(query)
  if (normalizedQuery === "") {
    return []
  }

  return STATIC_PAGES.flatMap((page) => {
    const name = t(`searchOverlay.pages.${page.nameKey}`)
    const haystack = normalize(name)
    if (!haystack.includes(normalizedQuery)) {
      return []
    }

    return [
      {
        name,
        to: page.to,
        type: "page",
      } satisfies SearchResult,
    ]
  })
}

const useSearchOverlayAnimation = (
  overlayRef: RefObject<HTMLDialogElement | null>,
  inputRef: RefObject<HTMLInputElement | null>,
  searchOpen: boolean,
) => {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  useGSAP(
    () => {
      if (!overlayRef.current) {
        return
      }

      const tl = gsap.timeline({ paused: true })
      tl.set(overlayRef.current, { display: "flex" })
      tl.fromTo(
        overlayRef.current,
        { clipPath: "inset(0 0 100% 0)" },
        { clipPath: "inset(0 0 0% 0)", duration: 0.55, ease: "power4.inOut" },
      )
      tl.fromTo(".search-bar", { autoAlpha: 0, y: -20 }, { autoAlpha: 1, duration: 0.4, ease: "power2.out", y: 0 }, "-=0.15")
      tl.fromTo(".search-content", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, duration: 0.4, ease: "power2.out", y: 0 }, "-=0.2")
      timelineRef.current = tl
    },
    { scope: overlayRef },
  )
  useEffect(() => {
    const tl = timelineRef.current
    if (!tl) {
      return
    }

    if (!searchOpen) {
      tl.reverse()

      return
    }
    tl.play()
    const focusTimeout = setTimeout(() => inputRef.current?.focus(), FOCUS_TIMEOUT_MS)

    return () => {
      clearTimeout(focusTimeout)
    }
  }, [searchOpen, inputRef])
}

const useSearchOverlayKeyboard = (searchOpen: boolean, onClose: () => void, onToggle: () => void) => {
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && searchOpen) {
        onClose()

        return
      }

      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onToggle()
      }
    }
    document.addEventListener("keydown", onKey)

    return () => {
      document.removeEventListener("keydown", onKey)
    }
  }, [onClose, onToggle, searchOpen])
}

export const useSearchOverlayLogic = (overlayRef: RefObject<HTMLDialogElement | null>, inputRef: RefObject<HTMLInputElement | null>) => {
  const t = useTranslations("components.custom.navigation")
  const locale = useLocale()
  const { searchOpen, setSearchOpen } = useNavigationStore(
    useShallow((state) => ({ searchOpen: state.searchOpen, setSearchOpen: state.setSearchOpen })),
  )

  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query.trim(), STOREFRONT_SEARCH_DEBOUNCE_MS)
  const searchEnabled = debouncedQuery.length >= STOREFRONT_SEARCH_MIN_LENGTH
  const { data: searchResults, isFetching: isSearchFetching } = useQuery({
    ...searchStorefrontQuery(debouncedQuery, locale),
    enabled: searchOpen && searchEnabled,
  })

  const { data: trendingItems = [] } = useQuery({ ...getTrendingSearchesQuery(locale), enabled: searchOpen })
  const filtered = useMemo<SearchResult[]>(() => {
    if (!searchEnabled) {
      return []
    }

    const serverItems = [
      ...(searchResults?.products ?? []),
      ...(searchResults?.categories ?? []),
      ...(searchResults?.collections ?? []),
    ].map((item) => mapServerItem(item))

    return [...serverItems, ...filterStaticPages(debouncedQuery, t)]
  }, [debouncedQuery, searchEnabled, searchResults, t])

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    for (const item of filtered) {
      const key = item.type
      groups[key] ??= []
      groups[key].push(item)
    }

    return groups
  }, [filtered])

  const handleClose = useCallback(() => {
    setSearchOpen(false)
    setQuery("")
  }, [setSearchOpen])

  const handleToggle = useCallback(() => {
    setSearchOpen(!searchOpen)
    if (searchOpen) {
      setQuery("")
    }
  }, [searchOpen, setSearchOpen])
  useSearchOverlayAnimation(overlayRef, inputRef, searchOpen)
  useSearchOverlayKeyboard(searchOpen, handleClose, handleToggle)
  const hasQuery = query.trim().length > 0
  const hasResults = filtered.length > 0
  const showTrending = !hasQuery
  const isSearching = hasQuery && (query.trim() !== debouncedQuery || (searchEnabled && isSearchFetching))

  return {
    debouncedQuery,
    filtered,
    grouped,
    handleClearQuery: () => {
      setQuery("")
    },
    handleClose,
    handleQueryChange: (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value)
    },
    hasQuery,
    hasResults,
    isSearching,
    query,
    searchOpen,
    showTrending,
    trendingItems,
  }
}

const FOCUS_TIMEOUT_MS = 300

export interface SearchResult {
  detail?: string | undefined
  to: LocalizedTo
  params?:
    | {
        handle: string
      }
    | undefined
  image?: string | undefined
  name: string
  type: StorefrontSearch["resultType"]
}

const STATIC_PAGES = [
  { nameKey: "brand", to: ROUTES.ABOUT },
  { nameKey: "allProducts", to: ROUTES.PRODUCTS },
] as const

const SEARCH_RESULT_ROUTES = {
  category: ROUTES.CATEGORY,
  collection: ROUTES.COLLECTION,
  page: ROUTES.PRODUCTS,
  product: ROUTES.PRODUCT,
} as const
