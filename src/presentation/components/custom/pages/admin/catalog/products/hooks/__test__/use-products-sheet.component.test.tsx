import { type JSX, type ReactNode } from "react"

import { QueryClient, QueryClientProvider, queryOptions, useSuspenseQuery } from "@tanstack/react-query"
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_QUERY_KEYS, PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"
import { getAdminProductQuery } from "~/src/modules/product/use-cases/get-admin-product"

import {
  type ProductRow,
  ProductsGridHarness,
  productRow,
} from "~/src/presentation/components/custom/pages/admin/catalog/products/components/__test__/products-grid-harness"
import {
  ProductsSheetProvider,
  useProductsSheet,
  useProductsSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-sheet"
import { productsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid"

const detail = vi.hoisted(() => ({
  fetch: vi.fn((handle: string) => Promise.resolve({ handle })),
}))

vi.mock("~/src/modules/product/use-cases/get-admin-product", () => ({
  getAdminProductQuery: (handle: string) =>
    queryOptions({
      queryFn: () => detail.fetch(handle),
      queryKey: ["admin", "products", "by-handle", handle] as const,
      staleTime: PRODUCT_QUERY_STALE_MS,
    }),
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

  it("swallows a failed prefetch instead of breaking the row press", async () => {
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

const OpenedProduct = ({ handle }: Readonly<{ handle: string }>): JSX.Element => {
  const { data } = useSuspenseQuery(getAdminProductQuery(handle))

  return <output aria-label="Opened product">{data.handle}</output>
}

const ProductsGridWithSheet = ({ rows }: Readonly<{ rows: readonly ProductRow[] }>): JSX.Element => {
  const sheet = useProductsSheetState()

  return (
    <ProductsGridHarness rows={rows} onRowClick={sheet.openEdit} onRowPointerDown={sheet.prefetchEdit}>
      {() => (
        <>
          <productsDataGrid.Body />
          {sheet.product !== undefined && <OpenedProduct handle={sheet.product.handle} />}
        </>
      )}
    </ProductsGridHarness>
  )
}

const TEN_ROWS = Array.from({ length: 10 }, (_, index) => productRow({ handle: `ring-${index}`, id: `product-${index}` }))

describe("useProductsSheetState in the products grid", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("requests no product while the pointer moves across the rows", async () => {
    renderWithProviders(<ProductsGridWithSheet rows={TEN_ROWS} />)

    for (const { handle } of TEN_ROWS) {
      await userEvent.hover(screen.getByText(handle))
    }
    await userEvent.unhover(screen.getByText("ring-9"))

    expect(detail.fetch).not.toHaveBeenCalled()
  })

  it("opens the pressed product from the one request its press started", async () => {
    const response = Promise.withResolvers<{ handle: string }>()
    detail.fetch.mockReturnValueOnce(response.promise)
    const user = userEvent.setup()
    renderWithProviders(<ProductsGridWithSheet rows={TEN_ROWS} />)
    const pressed = screen.getByText("ring-3")

    await user.pointer({ keys: "[MouseLeft>]", target: pressed })

    expect(detail.fetch).toHaveBeenCalledExactlyOnceWith("ring-3")

    await user.pointer({ keys: "[/MouseLeft]", target: pressed })

    expect(screen.queryByRole("status", { name: "Opened product" })).toBeNull()

    response.resolve({ handle: "ring-3" })

    expect(await screen.findByRole("status", { name: "Opened product" })).toHaveTextContent("ring-3")
    expect(detail.fetch).toHaveBeenCalledOnce()
  })
})
