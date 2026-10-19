import { describe, expect, it, vi } from "vite-plus/test"

import { PRODUCT_ADMIN_STATUS } from "~/src/modules/product/product.constants"
import { type CatalogUpsertInput } from "~/src/modules/product/product.zod"
import {
  prepareCatalogReplacePayload,
  prepareOrganizationReplacePayload,
} from "~/src/modules/product/use-cases/save-complete-product.server"

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))
vi.mock("~/src/modules/product/product.accessors", () => ({}))

const locales = (pl: string, en = pl): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const PRIMARY_CATEGORY_ID = "0195b6f4-0000-7000-8000-000000000001"

const EXTRA_CATEGORY_ID = "0195b6f4-0000-7000-8000-000000000002"

const COLLECTION_ID = "0195b6f4-0000-7000-8000-000000000003"

const OPTION_ID = "0195b6f4-0000-7000-8000-000000000011"

const SMALL_VALUE_ID = "0195b6f4-0000-7000-8000-000000000012"

const LARGE_VALUE_ID = "0195b6f4-0000-7000-8000-000000000013"

const catalogInput = (overrides: Partial<CatalogUpsertInput> = {}): CatalogUpsertInput => ({
  additionalCategoryIds: [],
  collectionIds: [],
  descriptions: locales(""),
  handle: "srebrny-pierscionek",
  hasVariants: false,
  options: [],
  primaryCategoryId: PRIMARY_CATEGORY_ID,
  simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 5, sku: " SR-1 " },
  status: PRODUCT_ADMIN_STATUS.DRAFT,
  subtitles: locales(""),
  tags: { "en-US": [], "pl-PL": [] },
  titles: locales("Srebrny pierścionek", "Silver ring"),
  variants: [],
  ...overrides,
})

describe("prepareOrganizationReplacePayload", () => {
  it("declines to touch the organization rows when no primary category was chosen", () => {
    expect(prepareOrganizationReplacePayload("product-1", catalogInput({ primaryCategoryId: "" }))).toBeUndefined()
  })

  it("marks the primary category and de-duplicates the additional ones", () => {
    const payload = prepareOrganizationReplacePayload(
      "product-1",
      catalogInput({ additionalCategoryIds: [EXTRA_CATEGORY_ID, EXTRA_CATEGORY_ID, PRIMARY_CATEGORY_ID] }),
    )

    expect(payload?.categoryRows).toStrictEqual([
      { categoryId: PRIMARY_CATEGORY_ID, isPrimary: true, productId: "product-1" },
      { categoryId: EXTRA_CATEGORY_ID, isPrimary: false, productId: "product-1" },
    ])
  })

  it("ranks collections in the order they were selected, without duplicates", () => {
    const payload = prepareOrganizationReplacePayload("product-1", catalogInput({ collectionIds: [COLLECTION_ID, COLLECTION_ID] }))

    expect(payload?.collectionRows).toStrictEqual([{ collectionId: COLLECTION_ID, productId: "product-1", rank: 0 }])
  })
})

describe("prepareCatalogReplacePayload for a simple product", () => {
  it("creates exactly one default variant with its inventory row", () => {
    const payload = prepareCatalogReplacePayload("product-1", catalogInput(), new Set())

    expect(payload.optionRows).toStrictEqual([])
    expect(payload.optionValueRows).toStrictEqual([])
    expect(payload.optionOnVariantRows).toStrictEqual([])
    expect(payload.variantRows).toHaveLength(1)
    expect(payload.inventoryRows).toHaveLength(1)
  })

  it("keeps the identity of the variant the product already sells", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      catalogInput({
        simpleVariant: { compareAtPrice: "", id: "variant-1", manageInventory: true, price: "120.00", quantity: 5, sku: "SR-1" },
      }),
      new Set(["variant-1"]),
    )

    expect(payload.variantRows.map((row) => row.id)).toStrictEqual(["variant-1"])
    expect(payload.inventoryRows.map((row) => row.variantId)).toStrictEqual(["variant-1"])
  })

  it("never adopts a variant id the product does not own", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      catalogInput({
        simpleVariant: {
          compareAtPrice: "",
          id: "variant-of-another-product",
          manageInventory: true,
          price: "120.00",
          quantity: 5,
          sku: "SR-1",
        },
      }),
      new Set(["variant-1"]),
    )

    expect(payload.variantRows[0]?.id).not.toBe("variant-of-another-product")
  })

  it("stores the price in minor units and trims the SKU", () => {
    const [variantRow] = prepareCatalogReplacePayload("product-1", catalogInput(), new Set()).variantRows

    expect(variantRow?.price).toBe(12_000)
    expect(variantRow?.sku).toBe("SR-1")
    expect(variantRow?.compareAtPrice).toBeUndefined()
  })

  it("drops an all-whitespace SKU instead of storing it", () => {
    const input = catalogInput({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 0, sku: "  " } })

    expect(prepareCatalogReplacePayload("product-1", input, new Set()).variantRows[0]?.sku).toBeUndefined()
  })

  it("opens the inventory row at the requested quantity with nothing reserved", () => {
    const [inventoryRow] = prepareCatalogReplacePayload("product-1", catalogInput(), new Set()).inventoryRows

    expect(inventoryRow).toMatchObject({ quantityAvailable: 5, quantityReserved: 0 })
  })

  it("links the inventory row to the variant it was created for", () => {
    const payload = prepareCatalogReplacePayload("product-1", catalogInput(), new Set())

    expect(payload.inventoryRows[0]?.variantId).toBe(payload.variantRows[0]?.id)
  })

  it("refuses to persist a price it cannot parse", () => {
    const input = catalogInput({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "abc", quantity: 1, sku: "" } })

    expect(() => prepareCatalogReplacePayload("product-1", input, new Set())).toThrow("Invalid money input")
  })

  it("still builds the default variant when no simple variant was submitted", () => {
    const payload = prepareCatalogReplacePayload("product-1", catalogInput({ simpleVariant: undefined }), new Set())
    const [variantRow] = payload.variantRows

    expect(variantRow).toMatchObject({ compareAtPrice: undefined, price: 0, sku: undefined, title: "Default" })
    expect(payload.inventoryRows[0]?.quantityAvailable).toBe(0)
  })

  it("keeps a supplied compare-at price in minor units", () => {
    const input = catalogInput({
      simpleVariant: { compareAtPrice: "150.00", manageInventory: true, price: "120.00", quantity: 1, sku: "" },
    })

    expect(prepareCatalogReplacePayload("product-1", input, new Set()).variantRows[0]?.compareAtPrice).toBe(15_000)
  })
})

const variantInput = catalogInput({
  hasVariants: true,
  options: [
    {
      titles: locales("Rozmiar", "Size"),
      values: [{ labels: locales("Mały", "Small") }, { labels: locales("Duży", "Large") }],
    },
  ],
  simpleVariant: undefined,
  variants: [
    { compareAtPrice: "", manageInventory: true, optionValues: { Rozmiar: "Mały" }, price: "100.00", quantity: 2, sku: "SR-S" },
    { compareAtPrice: "", manageInventory: true, optionValues: { Rozmiar: "Duży" }, price: "130.00", quantity: 3, sku: "SR-L" },
  ],
})

describe("prepareCatalogReplacePayload for a variant product", () => {
  it("persists one option with one row per value", () => {
    const payload = prepareCatalogReplacePayload("product-1", variantInput, new Set())

    expect(payload.optionRows).toHaveLength(1)
    expect(payload.optionValueRows).toHaveLength(2)
    expect(payload.optionValueRows.map((row) => row.rank)).toStrictEqual([0, 1])
  })

  it("creates one variant per option value combination", () => {
    const payload = prepareCatalogReplacePayload("product-1", variantInput, new Set())

    expect(payload.variantRows).toHaveLength(2)
    expect(payload.inventoryRows.map((row) => row.quantityAvailable)).toStrictEqual([2, 3])
  })

  it("keeps unfilled draft combinations unpriced and out of stock", () => {
    const payload = prepareCatalogReplacePayload("product-1", { ...variantInput, variants: variantInput.variants.slice(0, 1) }, new Set())

    expect(payload.variantRows.map((row) => ({ price: row.price, sku: row.sku, title: row.title }))).toStrictEqual([
      { price: 10_000, sku: "SR-S", title: "Mały" },
      { price: 0, sku: undefined, title: "Duży" },
    ])
    expect(payload.inventoryRows.map((row) => row.quantityAvailable)).toStrictEqual([2, 0])
    expect(new Set(payload.variantRows.map((row) => row.id)).size).toBe(2)
  })

  it("matches each submitted row to its combination by option values", () => {
    const payload = prepareCatalogReplacePayload("product-1", variantInput, new Set())

    expect(payload.variantRows.map((row) => row.price)).toStrictEqual([10_000, 13_000])
    expect(payload.variantRows.map((row) => row.sku)).toStrictEqual(["SR-S", "SR-L"])
  })

  it("keeps each variant's compare-at price and persisted identity", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      {
        ...variantInput,
        variants: variantInput.variants.map((row, index) => ({ ...row, compareAtPrice: "180.00", id: `existing-${index}` })),
      },
      new Set(["existing-0", "existing-1"]),
    )

    expect(payload.variantRows.map((row) => ({ compareAtPrice: row.compareAtPrice, id: row.id }))).toStrictEqual([
      { compareAtPrice: 18_000, id: "existing-0" },
      { compareAtPrice: 18_000, id: "existing-1" },
    ])
  })

  it("gives a variant a new identity when its submitted id belongs to no variant of this product", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      { ...variantInput, variants: variantInput.variants.map((row) => ({ ...row, id: "variant-of-another-product" })) },
      new Set(["existing-0"]),
    )

    expect(payload.variantRows.map((row) => row.id)).not.toContain("variant-of-another-product")
    expect(new Set(payload.variantRows.map((row) => row.id)).size).toBe(2)
  })

  it("links every variant to the persisted option value row once the option carries its id", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      {
        ...variantInput,
        options: [
          {
            id: OPTION_ID,
            titles: locales("Rozmiar", "Size"),
            values: [
              { id: SMALL_VALUE_ID, labels: locales("Mały", "Small") },
              { id: LARGE_VALUE_ID, labels: locales("Duży", "Large") },
            ],
          },
        ],
        variants: [
          {
            compareAtPrice: "",
            manageInventory: true,
            optionValues: { [OPTION_ID]: SMALL_VALUE_ID },
            price: "100.00",
            quantity: 2,
            sku: "",
          },
          {
            compareAtPrice: "",
            manageInventory: true,
            optionValues: { [OPTION_ID]: LARGE_VALUE_ID },
            price: "130.00",
            quantity: 3,
            sku: "",
          },
        ],
      },
      new Set(),
    )

    const valueIds = new Set(payload.optionValueRows.map((row) => row.id))

    expect(payload.optionOnVariantRows).toHaveLength(2)
    expect(payload.optionOnVariantRows.every((row) => valueIds.has(row.valueId))).toBe(true)
    expect(payload.optionOnVariantRows.map((row) => row.optionId)).toStrictEqual([OPTION_ID, OPTION_ID])
  })

  it("writes no option_on_variant rows at all when the option has no persisted id, as on a first create", () => {
    const payload = prepareCatalogReplacePayload("product-1", variantInput, new Set())

    expect(payload.variantRows).toHaveLength(2)
    expect(payload.optionValueRows).toHaveLength(2)
    expect(payload.optionOnVariantRows).toStrictEqual([])
  })
})

const ownedSimpleVariant = (stock: Pick<CatalogUpsertInput["variants"][number], "loadedQuantity" | "quantity">) =>
  catalogInput({ simpleVariant: { compareAtPrice: "", id: "variant-1", manageInventory: true, price: "120.00", sku: "SR-1", ...stock } })

describe("prepareCatalogReplacePayload stock changes", () => {
  it("changes no stock of a variant whose stock the admin left as loaded", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      ownedSimpleVariant({ loadedQuantity: 5, quantity: 5 }),
      new Set(["variant-1"]),
    )

    expect(payload.inventoryAdjustments).toStrictEqual([])
  })

  it("turns a changed stock into the difference from the number the editor loaded", () => {
    const added = prepareCatalogReplacePayload("product-1", ownedSimpleVariant({ loadedQuantity: 1, quantity: 3 }), new Set(["variant-1"]))
    const removed = prepareCatalogReplacePayload(
      "product-1",
      ownedSimpleVariant({ loadedQuantity: 1, quantity: 0 }),
      new Set(["variant-1"]),
    )

    expect(added.inventoryAdjustments).toStrictEqual([{ quantityChange: 2, variantId: "variant-1" }])
    expect(removed.inventoryAdjustments).toStrictEqual([{ quantityChange: -1, variantId: "variant-1" }])
  })

  it("changes no stock of a variant whose stock the editor never loaded", () => {
    const payload = prepareCatalogReplacePayload("product-1", ownedSimpleVariant({ quantity: 9 }), new Set(["variant-1"]))

    expect(payload.inventoryAdjustments).toStrictEqual([])
  })

  it("gives a variant new to the product the typed stock as its first stock rather than a change", () => {
    const payload = prepareCatalogReplacePayload("product-1", ownedSimpleVariant({ loadedQuantity: 1, quantity: 4 }), new Set())

    expect(payload.inventoryAdjustments).toStrictEqual([])
    expect(payload.inventoryRows.map((row) => row.quantityAvailable)).toStrictEqual([4])
    expect(payload.inventoryRows[0]?.variantId).not.toBe("variant-1")
  })

  it("changes only the variants whose stock the admin edited", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      {
        ...variantInput,
        variants: variantInput.variants.map((row, index) => ({
          ...row,
          id: `existing-${String(index)}`,
          loadedQuantity: row.sku === "SR-L" ? 1 : row.quantity,
        })),
      },
      new Set(["existing-0", "existing-1"]),
    )

    expect(payload.inventoryAdjustments).toStrictEqual([{ quantityChange: 2, variantId: "existing-1" }])
  })
})

describe("prepareCatalogReplacePayload naming and matching variant rows", () => {
  it("names a variant after its combination when the submitted title is blank", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      {
        ...variantInput,
        variants: variantInput.variants.map((row) => ({ ...row, title: "  " })),
      },
      new Set(),
    )

    expect(payload.variantRows.map((row) => row.title)).toStrictEqual(["Mały", "Duży"])
  })

  it("keeps a submitted variant title", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      {
        ...variantInput,
        variants: variantInput.variants.map((row, index) => ({ ...row, title: `Wariant ${index}` })),
      },
      new Set(),
    )

    expect(payload.variantRows.map((row) => row.title)).toStrictEqual(["Wariant 0", "Wariant 1"])
  })

  it("falls back to the row at the same index when no option values were submitted", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      {
        ...variantInput,
        variants: variantInput.variants.map((row) => ({ ...row, optionValues: {} })),
      },
      new Set(),
    )

    expect(payload.variantRows.map((row) => row.price)).toStrictEqual([10_000, 13_000])
  })

  it("ignores the submitted rows' own ids for options it had to normalise away", () => {
    const payload = prepareCatalogReplacePayload(
      "product-1",
      {
        ...variantInput,
        options: [{ titles: { "en-US": "", "pl-PL": "Rozmiar" }, values: [{ labels: locales("Mały") }] }],
      },
      new Set(),
    )

    expect(payload.optionRows).toStrictEqual([])
    expect(payload.variantRows).toHaveLength(1)
    expect(payload.variantRows[0]?.title).toBe("Default")
  })
})
