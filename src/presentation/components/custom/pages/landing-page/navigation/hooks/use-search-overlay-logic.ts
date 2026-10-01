import { type ChangeEvent, type RefObject, type SyntheticEvent, useCallback, useEffect, useRef, useState } from "react"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useNavigate, useRouter } from "@tanstack/react-router"
import { useLocale, useTranslations } from "use-intl/react"
import { useShallow } from "zustand/react/shallow"

import { gsap, useGSAP } from "~/src/integrations/gsap/gsap.config"
import { getLenisInstance } from "~/src/integrations/lenis/lenis.instance"

import { STOREFRONT_SEARCH_DEBOUNCE_MS, STOREFRONT_SEARCH_MIN_LENGTH } from "~/src/modules/storefront-search/storefront-search.constants"
import { type StorefrontSearch } from "~/src/modules/storefront-search/storefront-search.types"
import { foldStorefrontSearchText } from "~/src/modules/storefront-search/storefront-search.utils"
import { getTrendingSearchesQuery } from "~/src/modules/storefront-search/use-cases/get-trending-searches"
import { searchStorefrontQuery } from "~/src/modules/storefront-search/use-cases/search-storefront"

import { useDebounce } from "~/src/hooks/use-debounce"

import { type LocalizedTo } from "~/src/presentation/components/custom/localized-link"
import {
  CLIP_CLOSED,
  CLIP_OPEN,
  DUR_QUICK,
  MENU_MEDIA,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-constants"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

import { ROUTES } from "~/src/routes"

const normalize = (text: string): string =>
  foldStorefrontSearchText(text)
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/gu, "")
    .replaceAll(/[^a-z0-9\s]/gu, "")

const mapServerItem = (item: StorefrontSearch["resultItem"]): SearchResult => ({
  detail: item.detail,
  image: item.image,
  name: item.name,
  params: item.type === "page" ? undefined : { handle: item.handle },
  to: SEARCH_RESULT_ROUTES[item.type],
  type: item.type,
})

const matchStaticPages = (term: string, t: (key: string) => string): SearchResult[] => {
  const normalizedTerm = normalize(term)
  if (normalizedTerm === "") {
    return []
  }

  return STATIC_PAGES.flatMap((page) => {
    const name = t(page.labelKey)

    return normalize(name).includes(normalizedTerm) ? [{ name, to: page.to, type: "page" } satisfies SearchResult] : []
  })
}

const groupResults = (results: readonly SearchResult[]): SearchResultGroups => {
  const groups: SearchResultGroups = { category: [], collection: [], page: [], product: [] }
  for (const item of results) {
    groups[item.type].push(item)
  }

  return groups
}

const resolveStatus = ({ count, isError, searchable, settled }: StatusInput): SearchStatus => {
  if (!searchable) {
    return "idle"
  }

  if (isError) {
    return "error"
  }

  if (!settled) {
    return "searching"
  }

  return count === 0 ? "empty" : "results"
}

const useSearchOverlayAnimation = (overlayRef: RefObject<HTMLDialogElement | null>) => {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  useGSAP(
    () => {
      const overlay = overlayRef.current
      if (overlay === null) {
        return
      }

      const reduced = globalThis.matchMedia(MENU_MEDIA.reduced).matches
      const duration = (full: number): number => (reduced ? DUR_QUICK : full)
      const tl = gsap.timeline({
        onReverseComplete: () => {
          overlay.close()
        },
        paused: true,
      })
      tl.fromTo(overlay, { clipPath: CLIP_CLOSED }, { clipPath: CLIP_OPEN, duration: duration(REVEAL_DURATION), ease: "power4.inOut" })
      tl.fromTo(
        ".search-bar",
        { autoAlpha: 0, y: -20 },
        { autoAlpha: 1, duration: duration(SETTLE_DURATION), ease: "power2.out", y: 0 },
        "-=0.15",
      )
      tl.fromTo(
        ".search-content",
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, duration: duration(SETTLE_DURATION), ease: "power2.out", y: 0 },
        "-=0.2",
      )
      timelineRef.current = tl
    },
    { scope: overlayRef },
  )

  return timelineRef
}

const useSearchOverlayDialog = (
  refs: { readonly input: RefObject<HTMLInputElement | null>; readonly overlay: RefObject<HTMLDialogElement | null> },
  searchOpen: boolean,
  onClose: () => void,
) => {
  const router = useRouter()
  const timelineRef = useSearchOverlayAnimation(refs.overlay)
  useEffect(() => {
    const overlay = refs.overlay.current
    const timeline = timelineRef.current
    if (overlay === null || timeline === null || !searchOpen) {
      return
    }

    if (!overlay.open) {
      overlay.showModal()
    }
    timeline.play()
    refs.input.current?.focus()
    getLenisInstance()?.stop()
    gsap.set("html", { overflow: "hidden" })
    const unsubscribe = router.subscribe("onBeforeNavigate", onClose)

    return () => {
      unsubscribe()
      gsap.set("html", { clearProps: "overflow" })
      getLenisInstance()?.start()
      timeline.reverse()
    }
  }, [onClose, refs.input, refs.overlay, router, searchOpen, timelineRef])
}

const useSearchOverlayShortcuts = (searchOpen: boolean, onClose: () => void, onToggle: () => void) => {
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
  const navigate = useNavigate()
  const { searchOpen, setSearchOpen } = useNavigationStore(
    useShallow((state) => ({ searchOpen: state.searchOpen, setSearchOpen: state.setSearchOpen })),
  )

  const [query, setQuery] = useState("")
  const term = query.trim()
  const debouncedTerm = useDebounce(term, STOREFRONT_SEARCH_DEBOUNCE_MS)
  const searchable = term.length >= STOREFRONT_SEARCH_MIN_LENGTH
  const { data, isError, isFetching, refetch } = useQuery({
    ...searchStorefrontQuery(debouncedTerm, locale),
    enabled: searchOpen && debouncedTerm.length >= STOREFRONT_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
  })

  const { data: browseItems = [] } = useQuery({ ...getTrendingSearchesQuery(locale), enabled: searchOpen })
  const results: SearchResult[] =
    searchable && data !== undefined
      ? [
          ...[...data.products, ...data.categories, ...data.collections].map((item) => mapServerItem(item)),
          ...matchStaticPages(debouncedTerm, t),
        ]
      : []
  const status = resolveStatus({ count: results.length, isError, searchable, settled: term === debouncedTerm && !isFetching })

  const handleClose = useCallback(() => {
    setSearchOpen(false)
    setQuery("")
  }, [setSearchOpen])

  const handleToggle = useCallback(() => {
    if (searchOpen) {
      handleClose()

      return
    }
    setSearchOpen(true)
  }, [handleClose, searchOpen, setSearchOpen])
  useSearchOverlayDialog({ input: inputRef, overlay: overlayRef }, searchOpen, handleClose)
  useSearchOverlayShortcuts(searchOpen, handleClose, handleToggle)

  return {
    browseItems,
    grouped: groupResults(results),
    handleClearQuery: () => {
      setQuery("")
      inputRef.current?.focus()
    },
    handleClose,
    handleQueryChange: (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value)
    },
    handleRetry: () => {
      void refetch()
    },
    handleSubmit: (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!searchable) {
        return
      }
      handleClose()
      void navigate({ params: true, search: { q: term }, to: ROUTES.PRODUCTS })
    },
    query,
    results,
    status,
    statusMessage: STATUS_MESSAGE[status](results.length, t),
    term: debouncedTerm,
  }
}

const REVEAL_DURATION = 0.55

const SETTLE_DURATION = 0.4

export type SearchStatus = "empty" | "error" | "idle" | "results" | "searching"

export interface SearchResult {
  detail?: string | undefined
  to: LocalizedTo
  params?: { handle: string } | undefined
  image?: string | undefined
  name: string
  type: StorefrontSearch["resultType"]
}

export type SearchResultGroups = Record<SearchResult["type"], SearchResult[]>

interface StatusInput {
  readonly count: number
  readonly isError: boolean
  readonly searchable: boolean
  readonly settled: boolean
}

type StatusTranslator = ReturnType<typeof useTranslations<"components.custom.navigation">>

const STATUS_MESSAGE: Record<SearchStatus, (count: number, t: StatusTranslator) => string> = {
  empty: (_count, t) => t("searchOverlay.noResults"),
  error: (_count, t) => t("searchOverlay.error"),
  idle: () => "",
  results: (count, t) => t("searchOverlay.resultsCount", { count }),
  searching: (_count, t) => t("searchOverlay.searching"),
}

const STATIC_PAGES = [
  { labelKey: "searchOverlay.pages.brand", to: ROUTES.ABOUT },
  { labelKey: "searchOverlay.pages.allProducts", to: ROUTES.PRODUCTS },
  { labelKey: "menu.links.faq", to: ROUTES.FAQ },
  { labelKey: "menu.links.shipping", to: ROUTES.EXCHANGES_AND_RETURNS },
] as const

const SEARCH_RESULT_ROUTES = {
  category: ROUTES.CATEGORY,
  collection: ROUTES.COLLECTION,
  page: ROUTES.PRODUCTS,
  product: ROUTES.PRODUCT,
} as const
