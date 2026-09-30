import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { useProductsCatalogInfiniteScroll } from "~/src/presentation/components/custom/pages/products-catalog/hooks/use-products-catalog-infinite-scroll"

type TriggerCallback = (entries: readonly { isIntersecting: boolean }[]) => void

interface ObserverOptions {
  readonly rootMargin?: string | undefined
}

interface ObserverRecord {
  readonly callback: TriggerCallback
  disconnected: boolean
  readonly options: ObserverOptions | undefined
  readonly targets: Element[]
}

const records = new WeakMap<object, ObserverRecord>()

const observers: ObserverRecord[] = []

class TestIntersectionObserver {
  constructor(callback: TriggerCallback, options?: ObserverOptions) {
    const record: ObserverRecord = { callback, disconnected: false, options, targets: [] }
    records.set(this, record)
    observers.push(record)
  }

  disconnect(): void {
    const record = records.get(this)

    if (record !== undefined) {
      record.disconnected = true
    }
  }

  observe(target: Element): void {
    records.get(this)?.targets.push(target)
  }
}

const latestObserver = (): ObserverRecord => {
  const observer = observers.at(-1)

  if (observer === undefined) {
    throw new Error("No IntersectionObserver was created")
  }

  return observer
}

const trigger = (isIntersecting: boolean): void => {
  const observer = latestObserver()
  observer.callback(observer.targets.map(() => ({ isIntersecting })))
}

type ScrollOptions = Parameters<typeof useProductsCatalogInfiniteScroll>[0]

const options = (overrides: Partial<ScrollOptions> = {}): ScrollOptions => ({
  enabled: true,
  fetchNextPage: vi.fn(() => Promise.resolve(undefined)),
  hasNextPage: true,
  isFetchingNextPage: false,
  ...overrides,
})

const renderScroll = (initialProps: ScrollOptions) =>
  renderHook((props: ScrollOptions) => useProductsCatalogInfiniteScroll(props), { initialProps })

const withSentinel = (overrides: Partial<ScrollOptions> = {}) => {
  const rendered = renderScroll(options({ enabled: false }))
  rendered.result.current.current = document.createElement("div")
  rendered.rerender(options(overrides))

  return rendered
}

beforeEach(() => {
  observers.length = 0
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("useProductsCatalogInfiniteScroll", () => {
  it("does not observe anything while the sentinel is unmounted", () => {
    renderScroll(options())

    expect(observers).toHaveLength(0)
  })

  it("observes the attached sentinel", () => {
    withSentinel()

    expect(latestObserver().targets).toHaveLength(1)
  })

  it("fetches the next page when the sentinel scrolls into view", () => {
    const fetchNextPage = vi.fn(() => Promise.resolve(undefined))
    withSentinel({ fetchNextPage })

    trigger(true)

    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it("ignores an intersection that leaves the viewport", () => {
    const fetchNextPage = vi.fn(() => Promise.resolve(undefined))
    withSentinel({ fetchNextPage })

    trigger(false)

    expect(fetchNextPage).not.toHaveBeenCalled()
  })

  it("does not fetch again while a page is already loading", () => {
    const fetchNextPage = vi.fn(() => Promise.resolve(undefined))
    withSentinel({ fetchNextPage, isFetchingNextPage: true })

    trigger(true)

    expect(fetchNextPage).not.toHaveBeenCalled()
  })

  it("never observes while the hook is disabled", () => {
    withSentinel({ enabled: false })

    expect(observers).toHaveLength(0)
  })

  it("never observes once the last page is loaded", () => {
    withSentinel({ hasNextPage: false })

    expect(observers).toHaveLength(0)
  })

  it("prefetches ahead of the sentinel by a fixed root margin", () => {
    withSentinel()

    expect(latestObserver().options).toStrictEqual({ rootMargin: "240px" })
  })

  it("disconnects the observer when the component unmounts", () => {
    const rendered = withSentinel()

    rendered.unmount()

    expect(latestObserver().disconnected).toBe(true)
  })
})
