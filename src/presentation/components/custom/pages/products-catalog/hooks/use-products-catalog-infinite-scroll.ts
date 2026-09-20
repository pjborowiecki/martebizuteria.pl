import { type RefObject, useEffect, useRef } from "react"
export const useProductsCatalogInfiniteScroll = ({
  enabled,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: UseProductsCatalogInfiniteScrollOptions): RefObject<HTMLDivElement | null> => {
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!enabled || !hasNextPage) {
      return
    }
    const sentinel = sentinelRef.current
    if (sentinel === null) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting === true && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      {
        rootMargin: INTERSECTION_ROOT_MARGIN,
      },
    )
    observer.observe(sentinel)
    return () => {
      observer.disconnect()
    }
  }, [enabled, fetchNextPage, hasNextPage, isFetchingNextPage])
  return sentinelRef
}
const INTERSECTION_ROOT_MARGIN = "240px"
interface UseProductsCatalogInfiniteScrollOptions {
  readonly enabled: boolean
  readonly fetchNextPage: () => Promise<unknown>
  readonly hasNextPage: boolean
  readonly isFetchingNextPage: boolean
}
