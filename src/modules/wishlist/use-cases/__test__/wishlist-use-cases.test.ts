import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  WISHLIST_ERROR_CODES,
  WISHLIST_MAX_ITEMS,
  WISHLIST_MUTATION_KEYS,
  WISHLIST_QUERY_KEYS,
} from "~/src/modules/wishlist/wishlist.constants"

import { listWishlistItems, listWishlistItemsQuery } from "../list-wishlist-items"
import { listWishlistProductIds, listWishlistProductIdsQuery } from "../list-wishlist-product-ids"
import { toggleWishlistItem, toggleWishlistItemMutation } from "../toggle-wishlist-item"

const USER_ID = "user-1"

const PRODUCT_ID = "0199bb55-3f5e-7aaa-8c4e-d4f5a6b7c8d9"

const accessors = vi.hoisted(() => ({
  getProductIds: vi.fn(),
  getRows: vi.fn(),
  insertItem: vi.fn(),
}))

const database = vi.hoisted(() => ({ batch: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: { batch: database.batch } }))
vi.mock("~/src/lib/image", () => ({ getProductImageUrl: (path: string | null) => (path === null ? undefined : `cdn/${path}`) }))
vi.mock("~/src/modules/wishlist/wishlist.accessors", () => ({
  deleteWishlistItemQuery: (userId: string, productId: string) => ({ delete: [userId, productId] }),
  getPublishedProductForCustomerQuery: (userId: string, productId: string) => ({ published: [userId, productId] }),
  getWishlistProductIds: accessors.getProductIds,
  getWishlistRows: accessors.getRows,
  insertWishlistItem: accessors.insertItem,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options?: { data?: unknown }) =>
        handler({ context: { auth: { user: { id: USER_ID } } }, data: options?.data }),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        const validating = {
          handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options?: { data?: unknown }) =>
            Promise.resolve(options?.data).then((data) => handler({ context: { auth: { user: { id: USER_ID } } }, data: validate(data) })),
          middleware: () => validating,
          validator: () => validating,
        }

        return validating
      },
    }

    return builder
  },
}))

const wishlistRow = (overrides: Record<string, unknown> = {}) => ({
  addedAt: new Date("2026-09-14T10:00:00.000Z"),
  handle: "aurora-ring",
  priceMinorUnits: 24_900,
  productId: PRODUCT_ID,
  status: "published",
  thumbnail: "products/aurora.webp",
  titles: { "en-US": "Aurora ring", "pl-PL": "Pierścionek Aurora" },
  totalStock: 3,
  variantId: "variant-1",
  variantTitle: "Gold / 54",
  ...overrides,
})

interface ToggleReads {
  readonly published?: readonly { id: string; wishlistCount: number }[]
  readonly removed?: readonly { id: string }[]
}

const onSale = (wishlistCount: number) => [{ id: PRODUCT_ID, wishlistCount }]

const toggleReads = ({ published = onSale(0), removed = [] }: ToggleReads = {}) => [removed, published]

const ALREADY_SAVED = [{ id: "wishlist-1" }]

beforeEach(() => {
  vi.clearAllMocks()
  database.batch.mockResolvedValue(toggleReads())
  accessors.insertItem.mockResolvedValue(undefined)
  accessors.getProductIds.mockResolvedValue([])
  accessors.getRows.mockResolvedValue([])
})

describe("toggleWishlistItem", () => {
  it("saves a product the customer has not saved yet", async () => {
    await expect(toggleWishlistItem({ data: { productId: PRODUCT_ID } })).resolves.toStrictEqual({ wishlisted: true })
    expect(accessors.insertItem).toHaveBeenCalledWith(USER_ID, PRODUCT_ID)
  })

  it("removes a product the customer had already saved without inserting it again", async () => {
    database.batch.mockResolvedValue(toggleReads({ removed: ALREADY_SAVED }))

    await expect(toggleWishlistItem({ data: { productId: PRODUCT_ID } })).resolves.toStrictEqual({ wishlisted: false })
    expect(accessors.insertItem).not.toHaveBeenCalled()
  })

  it("deletes the caller's own row first, then reads the product with the caller's count, in one batch", async () => {
    await toggleWishlistItem({ data: { productId: PRODUCT_ID } })

    expect(database.batch).toHaveBeenCalledExactlyOnceWith([{ delete: [USER_ID, PRODUCT_ID] }, { published: [USER_ID, PRODUCT_ID] }])
  })

  it("refuses to save a product that is not on sale", async () => {
    database.batch.mockResolvedValue(toggleReads({ published: [] }))

    await expect(toggleWishlistItem({ data: { productId: PRODUCT_ID } })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
    expect(accessors.insertItem).not.toHaveBeenCalled()
  })

  it("still lets go of a saved product that has since been withdrawn", async () => {
    database.batch.mockResolvedValue(toggleReads({ published: [], removed: ALREADY_SAVED }))

    await expect(toggleWishlistItem({ data: { productId: PRODUCT_ID } })).resolves.toStrictEqual({ wishlisted: false })
  })

  it("rejects a blank product id", async () => {
    await expect(toggleWishlistItem({ data: { productId: "   " } })).rejects.toThrow()
    expect(database.batch).not.toHaveBeenCalled()
  })

  it("refuses to save beyond the wishlist ceiling instead of dropping items from the list", async () => {
    database.batch.mockResolvedValue(toggleReads({ published: onSale(WISHLIST_MAX_ITEMS) }))

    await expect(toggleWishlistItem({ data: { productId: PRODUCT_ID } })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: WISHLIST_ERROR_CODES.FULL,
    })
    expect(accessors.insertItem).not.toHaveBeenCalled()
  })

  it("still saves the last product that fits", async () => {
    database.batch.mockResolvedValue(toggleReads({ published: onSale(WISHLIST_MAX_ITEMS - 1) }))

    await expect(toggleWishlistItem({ data: { productId: PRODUCT_ID } })).resolves.toStrictEqual({ wishlisted: true })
  })

  it("lets a full wishlist give a product up", async () => {
    database.batch.mockResolvedValue(toggleReads({ published: onSale(WISHLIST_MAX_ITEMS), removed: ALREADY_SAVED }))

    await expect(toggleWishlistItem({ data: { productId: PRODUCT_ID } })).resolves.toStrictEqual({ wishlisted: false })
  })

  it("is keyed so the UI can track the toggle", () => {
    expect(toggleWishlistItemMutation.mutationKey).toStrictEqual(WISHLIST_MUTATION_KEYS.TOGGLE)
  })

  it("toggles the product the heart button was pressed for", async () => {
    await expect(
      toggleWishlistItemMutation.mutationFn?.({ productId: PRODUCT_ID }, { client: new QueryClient(), meta: undefined }),
    ).resolves.toStrictEqual({ wishlisted: true })
    expect(accessors.insertItem).toHaveBeenCalledWith(USER_ID, PRODUCT_ID)
  })
})

describe("listWishlistItems", () => {
  it("resolves each saved product for the requested locale", async () => {
    accessors.getRows.mockResolvedValue([wishlistRow()])

    const items = await listWishlistItems({ data: { locale: "pl-PL" } })

    expect(items).toStrictEqual([
      {
        addedAt: new Date("2026-09-14T10:00:00.000Z"),
        available: true,
        handle: "aurora-ring",
        inStock: true,
        priceMinorUnits: 24_900,
        productId: PRODUCT_ID,
        thumbnail: "cdn/products/aurora.webp",
        title: "Pierścionek Aurora",
        variantId: "variant-1",
        variantTitle: "Gold / 54",
      },
    ])
  })

  it("falls back to the store locale when the caller asks for none", async () => {
    accessors.getRows.mockResolvedValue([wishlistRow()])

    const [item] = await listWishlistItems({ data: undefined })

    expect(item?.title).toBe("Pierścionek Aurora")
  })

  it("reports a sold-out product as saved but not in stock", async () => {
    accessors.getRows.mockResolvedValue([wishlistRow({ totalStock: 0 })])

    const [item] = await listWishlistItems({ data: { locale: "en-US" } })

    expect(item).toMatchObject({ available: true, inStock: false })
  })

  it("reports a withdrawn product as no longer available", async () => {
    accessors.getRows.mockResolvedValue([wishlistRow({ status: "archived" })])

    const [item] = await listWishlistItems({ data: { locale: "en-US" } })

    expect(item?.available).toBe(false)
  })

  it("reads only the caller's own wishlist", async () => {
    await listWishlistItems({ data: { locale: "en-US" } })

    expect(accessors.getRows).toHaveBeenCalledWith(USER_ID)
  })

  it("keys the list by locale so a language switch refetches", () => {
    expect(listWishlistItemsQuery("pl-PL").queryKey).toStrictEqual([...WISHLIST_QUERY_KEYS.ITEMS, "pl-PL"])
  })

  it("loads the list in the locale the query was built for", async () => {
    accessors.getRows.mockResolvedValue([wishlistRow()])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const items = await queryClient.query(listWishlistItemsQuery("en-US"))

    expect(items.map((item) => item.title)).toStrictEqual(["Aurora ring"])
  })
})

describe("listWishlistProductIds", () => {
  it("returns the ids the customer has saved", async () => {
    accessors.getProductIds.mockResolvedValue([PRODUCT_ID])

    await expect(listWishlistProductIds()).resolves.toStrictEqual([PRODUCT_ID])
    expect(accessors.getProductIds).toHaveBeenCalledWith(USER_ID)
  })

  it("is cached under its own key so every product card can share one read", () => {
    expect(listWishlistProductIdsQuery().queryKey).toStrictEqual(WISHLIST_QUERY_KEYS.PRODUCT_IDS)
  })
})

describe("wishlist query fetching", () => {
  it("reads the saved product ids once for the whole page", async () => {
    accessors.getProductIds.mockResolvedValue([PRODUCT_ID])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await queryClient.query(listWishlistProductIdsQuery())
    await queryClient.query(listWishlistProductIdsQuery())

    expect(accessors.getProductIds).toHaveBeenCalledOnce()
  })
})
