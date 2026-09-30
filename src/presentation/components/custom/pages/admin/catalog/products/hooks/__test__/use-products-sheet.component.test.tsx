import { type JSX, type ReactNode } from "react"

import { QueryClient, QueryClientProvider, queryOptions } from "@tanstack/react-query"
import { act, cleanup, render, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

import {
  ProductsSheetProvider,
  useProductsSheet,
  useProductsSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-sheet"

const detail = vi.hoisted(() => ({
  fetch: vi.fn((handle: string) => Promise.resolve({ handle })),
}))

vi.mock("~/src/modules/product/use-cases/get-admin-product", () => ({
  getAdminProductQuery: (handle: string) =>
    queryOptions({ queryFn: () => detail.fetch(handle), queryKey: ["admin", "products", "by-handle", handle] as const }),
}))

const product = (handle: string): Product["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: null,
  handle,
  id: `id-${handle}`,
  inventoryLevel: "ok",
  metadata: null,
  primaryCategoryId: null,
  rank: 0,
  status: "published",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": handle, "pl-PL": handle },
  totalStock: 2,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  variantCount: 1,
})

const renderSheetState = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  return { ...renderHook(() => useProductsSheetState(), { wrapper }), queryClient }
}

describe("useProductsSheetState", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("starts closed with no product attached", () => {
    const { result } = renderSheetState()

    expect(result.current.mode).toBe("closed")
    expect(result.current.open).toBe(false)
    expect(result.current.product).toBeUndefined()
  })

  it("opens in create mode without a product", () => {
    const { result } = renderSheetState()

    act(() => {
      result.current.openCreate()
    })

    expect(result.current.mode).toBe("create")
    expect(result.current.open).toBe(true)
    expect(result.current.product).toBeUndefined()
  })

  it("opens edit straight away when the product detail is already cached", () => {
    const { queryClient, result } = renderSheetState()
    const row = product("silver-ring")
    queryClient.setQueryData([...PRODUCT_QUERY_KEYS.ADMIN.BY_HANDLE, "silver-ring"], { handle: "silver-ring" })

    act(() => {
      result.current.openEdit(row)
    })

    expect(result.current.mode).toBe("edit")
    expect(result.current.product).toBe(row)
    expect(detail.fetch).not.toHaveBeenCalled()
  })

  it("loads the product detail before opening edit when nothing is cached", async () => {
    const { result } = renderSheetState()
    const row = product("gold-ring")

    act(() => {
      result.current.openEdit(row)
    })

    expect(result.current.mode).toBe("closed")

    await waitFor(() => {
      expect(result.current.mode).toBe("edit")
    })
    expect(detail.fetch).toHaveBeenCalledWith("gold-ring")
    expect(result.current.product).toBe(row)
  })

  it("forgets the product again when closed", async () => {
    const { queryClient, result } = renderSheetState()
    queryClient.setQueryData([...PRODUCT_QUERY_KEYS.ADMIN.BY_HANDLE, "silver-ring"], { handle: "silver-ring" })

    act(() => {
      result.current.openEdit(product("silver-ring"))
    })
    act(() => {
      result.current.close()
    })

    expect(result.current.mode).toBe("closed")
    expect(result.current.product).toBeUndefined()
    await waitFor(() => {
      expect(result.current.open).toBe(false)
    })
  })

  it("closes on a false open request and ignores a true one", () => {
    const { result } = renderSheetState()

    act(() => {
      result.current.openCreate()
    })
    act(() => {
      result.current.setOpen(false)
    })

    expect(result.current.open).toBe(false)

    act(() => {
      result.current.setOpen(true)
    })

    expect(result.current.open).toBe(false)
  })

  it("warms the product detail cache without opening the sheet", async () => {
    const { result } = renderSheetState()

    act(() => {
      result.current.prefetchEdit(product("silver-chain"))
    })

    await waitFor(() => {
      expect(detail.fetch).toHaveBeenCalledWith("silver-chain")
    })
    expect(result.current.mode).toBe("closed")
  })

  it("swallows a failed prefetch instead of breaking the row hover", async () => {
    detail.fetch.mockRejectedValueOnce(new Error("offline"))
    const { result } = renderSheetState()

    act(() => {
      result.current.prefetchEdit(product("silver-chain"))
    })

    await waitFor(() => {
      expect(detail.fetch).toHaveBeenCalledTimes(1)
    })
    expect(result.current.mode).toBe("closed")
  })
})

const SheetProbe = (): JSX.Element => {
  const { mode } = useProductsSheet()

  return <output>{mode}</output>
}

describe("useProductsSheet", () => {
  afterEach(() => {
    cleanup()
  })

  it("refuses to hand out the sheet api outside its provider", () => {
    expect(() => render(<SheetProbe />)).toThrow("useProductsSheet must be used within ProductsSheetProvider")
  })

  it("publishes the sheet api to descendants", () => {
    const { queryClient, result } = renderSheetState()

    act(() => {
      result.current.openCreate()
    })

    const { getByRole } = render(
      <QueryClientProvider client={queryClient}>
        <ProductsSheetProvider value={result.current}>
          <SheetProbe />
        </ProductsSheetProvider>
      </QueryClientProvider>,
    )

    expect(getByRole("status")).toHaveTextContent("create")
  })
})
