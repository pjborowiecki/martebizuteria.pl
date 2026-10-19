import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { countOpenCheckouts } from "~/src/modules/checkout/use-cases/count-open-checkouts.server"
import { fulfillCheckout } from "~/src/modules/checkout/use-cases/fulfill-checkout.server"
import { releaseCheckout } from "~/src/modules/checkout/use-cases/release-checkout.server"
import { reserveInventoryForItems } from "~/src/modules/inventory/use-cases/reserve-inventory.server"
import { PRODUCT_ADMIN_STATUS, PRODUCT_ERROR_CODES, type ProductAdminStatus } from "~/src/modules/product/product.constants"
import { buildAllProductImageRows, buildProductLevelAttributeRows, buildVariantAttributeGroups } from "~/src/modules/product/product.utils"
import { type ProductFormValues, parseCatalogUpsertInput } from "~/src/modules/product/product.zod"
import { getAdminProduct } from "~/src/modules/product/use-cases/get-admin-product"
import { updateCompleteProduct } from "~/src/modules/product/use-cases/update-complete-product"

import {
  mapProductDetailToFormValues,
  toCatalogUpsertPayload,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

const { expireSession, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    expireSession: vi.fn<(sessionId: string) => Promise<object>>(),
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest: () => new Request("https://marte.test/admin/catalog/products") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getRequestSession: () => Promise.resolve({ user: { role: ROLES.ADMIN, twoFactorEnabled: true } }),
}))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock("~/src/lib/background", () => ({ scheduleBackgroundWork: vi.fn() }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCatalogProductUpdatedAudit: vi.fn(),
  recordDiscountRedeemedAudit: vi.fn(),
  recordOrderPlacedAudit: vi.fn(),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: vi.fn(),
}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { checkout: { sessions: { expire: expireSession } } } }))

const HANDLE = "onyx-earrings"

const PRODUCT_ID = "019a0000-0000-7000-8000-000000000001"

const CATEGORY_ID = "019a0000-0000-7000-8000-000000000003"

const VARIANT_ID = "019a0000-0000-7000-8000-000000000002"

const PRICE = 24_900

const TRANSACTION_ID = "cs_onyx"

const HELD_LINE = { qty: 1, variantId: VARIANT_ID }

const stockSchema = z.object({ available: z.number(), reserved: z.number() })

const readStock = () =>
  stockSchema.parse(
    sqlite
      .prepare("select quantity_available as available, quantity_reserved as reserved from inventory where variant_id = ?")
      .get(VARIANT_ID),
  )

const readEnglishTitle = (): unknown =>
  sqlite.prepare(`select json_extract(titles, '$."en-US"') as title from product where handle = ?`).get(HANDLE)?.["title"]

const openEditor = async (): Promise<ProductFormValues> => {
  const detail = await getAdminProduct({ data: HANDLE })
  if (detail === undefined) {
    throw new TypeError(`No product ${HANDLE} to edit`)
  }

  return mapProductDetailToFormValues(detail)
}

const save = (values: ProductFormValues) =>
  updateCompleteProduct({
    data: {
      ...toCatalogUpsertPayload(parseCatalogUpsertInput(values), PRODUCT_ID),
      attributeValues: buildProductLevelAttributeRows(values),
      images: buildAllProductImageRows(values),
      variantAttributeValues: buildVariantAttributeGroups(values),
    },
  })

const withStock = (values: ProductFormValues, quantity: number): ProductFormValues => {
  const { simpleVariant } = values
  if (simpleVariant === undefined) {
    throw new TypeError("The editor loaded no stock field for the piece")
  }

  return { ...values, simpleVariant: { ...simpleVariant, quantity } }
}

const renamed = (values: ProductFormValues): ProductFormValues => ({
  ...values,
  titles: { "en-US": "Onyx drop earrings", "pl-PL": "Kolczyki z onyksem, wiszące" },
})

const SHOPPER = { clientAddress: "203.0.113.7", email: "anna@example.com" }

const holdInCheckout = async (): Promise<void> => {
  await reserveInventoryForItems([{ inventoryId: "inventory-onyx", qty: HELD_LINE.qty, title: "Onyx earrings" }])
  sqlite.exec(`
    insert into checkout (id, email, client_address, status) values ('checkout-onyx', '${SHOPPER.email}', '${SHOPPER.clientAddress}', 'pending');
    insert into payment (id, checkout_id, amount, provider, status, transaction_id, reserved_lines)
      values ('payment-onyx', 'checkout-onyx', ${String(PRICE)}, 'stripe', 'pending', '${TRANSACTION_ID}', '${JSON.stringify([HELD_LINE])}');
  `)
}

const readCheckoutStatuses = () =>
  z
    .object({ checkout: z.string(), payment: z.string() })
    .parse(
      sqlite
        .prepare(
          "select checkout.status as checkout, payment.status as payment from payment join checkout on checkout.id = payment.checkout_id where payment.transaction_id = ?",
        )
        .get(TRANSACTION_ID),
    )

const withStatus = (values: ProductFormValues, status: ProductAdminStatus): ProductFormValues => ({ ...values, status })

const expiredHeldSession = {
  id: TRANSACTION_ID,
  metadata: {
    items: JSON.stringify([
      { handle: HANDLE, imageUrl: "onyx.webp", price: PRICE, qty: HELD_LINE.qty, title: "Onyx earrings", variantId: VARIANT_ID },
    ]),
  },
  status: "expired",
}

const releaseHeldPiece = (): Promise<boolean> => releaseCheckout({ lines: [HELD_LINE], transactionId: TRANSACTION_ID })

const sellHeldPiece = (): Promise<string | undefined> =>
  fulfillCheckout({
    currency: "PLN",
    lines: [{ handle: HANDLE, imageUrl: "onyx.webp", price: PRICE, qty: 1, title: "Onyx earrings", variantId: VARIANT_ID }],
    locale: "en-US",
    paidAmount: PRICE,
    transactionId: TRANSACTION_ID,
  })

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "info").mockImplementation(() => {})
  expireSession.mockResolvedValue(expiredHeldSession)
  sqlite.exec(`
    delete from order_item;
    delete from "order";
    delete from payment;
    delete from checkout;
    delete from product;
    delete from product_category;
    delete from order_number_sequence;
    insert into product_category (id, handle, titles, status, created_at, updated_at)
      values ('${CATEGORY_ID}', 'earrings', '{"en-US":"Earrings","pl-PL":"Kolczyki"}', 'published', 0, 0);
    insert into product (id, handle, status, titles, primary_category_id)
      values ('${PRODUCT_ID}', '${HANDLE}', 'published', '{"en-US":"Onyx earrings","pl-PL":"Kolczyki z onyksem"}', '${CATEGORY_ID}');
    insert into category_on_product (product_id, category_id, is_primary) values ('${PRODUCT_ID}', '${CATEGORY_ID}', 1);
    insert into product_variant (id, product_id, title, price, sku)
      values ('${VARIANT_ID}', '${PRODUCT_ID}', 'Default', ${String(PRICE)}, 'ONYX-1');
    insert into inventory (id, variant_id, quantity_available, quantity_reserved) values ('inventory-onyx', '${VARIANT_ID}', 1, 0);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("saving a one-of-a-kind piece while customers reserve, release and buy it", () => {
  it("keeps the piece a customer reserved meanwhile reserved, and its release puts back exactly one", async () => {
    const editor = await openEditor()
    await holdInCheckout()

    await save(renamed(editor))

    expect(readEnglishTitle()).toBe("Onyx drop earrings")
    expect(readStock()).toMatchObject({ available: 0, reserved: 1 })

    await releaseHeldPiece()

    expect(readStock()).toMatchObject({ available: 1, reserved: 0 })
  })

  it("keeps the piece a customer bought meanwhile sold", async () => {
    const editor = await openEditor()
    await holdInCheckout()
    await sellHeldPiece()

    await save(renamed(editor))

    expect(readStock()).toMatchObject({ available: 0, reserved: 0 })
  })

  it("adds new stock to what the reservation left and gets the reserved piece back on release", async () => {
    const editor = await openEditor()
    await holdInCheckout()

    await save(withStock(editor, 3))

    expect(readStock()).toMatchObject({ available: 2, reserved: 1 })

    await releaseHeldPiece()

    expect(readStock()).toMatchObject({ available: 3, reserved: 0 })
  })

  it("keeps a piece a release returned while the editor was open", async () => {
    await holdInCheckout()
    const editor = await openEditor()

    expect(editor.simpleVariant).toMatchObject({ loadedQuantity: 0, quantity: 0, quantityInCheckout: 1 })

    await releaseHeldPiece()
    await save(withStock(editor, 2))

    expect(readStock()).toMatchObject({ available: 3, reserved: 0 })
  })

  it("refuses to take away a piece a customer reserved meanwhile, saves nothing, and saves once the admin reloads", async () => {
    const editor = await openEditor()
    await holdInCheckout()
    const reserved = readStock()
    const lastPieceRemoved = renamed(withStock(editor, 0))

    await expect(save(lastPieceRemoved)).rejects.toMatchObject({
      code: "CONFLICT",
      message: PRODUCT_ERROR_CODES.STOCK_CHANGED_WHILE_EDITING,
    })

    expect(readEnglishTitle()).toBe("Onyx earrings")
    expect(readStock()).toStrictEqual(reserved)

    const reloaded = await openEditor()

    expect(reloaded.simpleVariant).toMatchObject({ quantity: 0, quantityInCheckout: 1 })

    await save(renamed(reloaded))

    expect(readEnglishTitle()).toBe("Onyx drop earrings")
    expect(readStock()).toStrictEqual(reserved)
  })

  it("refuses to take away a piece a customer bought meanwhile", async () => {
    const editor = await openEditor()
    await holdInCheckout()
    await sellHeldPiece()

    await expect(save(withStock(editor, 0))).rejects.toMatchObject({ message: PRODUCT_ERROR_CODES.STOCK_CHANGED_WHILE_EDITING })

    expect(readStock()).toMatchObject({ available: 0, reserved: 0 })
  })
})

describe("taking a piece a customer is paying for off sale", () => {
  it("frees the shopper's places under the open-checkout limits along with the piece", async () => {
    const editor = await openEditor()
    await holdInCheckout()

    await expect(countOpenCheckouts(SHOPPER)).resolves.toStrictEqual({ byClientAddress: 1, byEmail: 1 })

    await save(withStatus(editor, PRODUCT_ADMIN_STATUS.ARCHIVED))

    await expect(countOpenCheckouts(SHOPPER)).resolves.toStrictEqual({ byClientAddress: 0, byEmail: 0 })
    expect(sqlite.prepare("select client_address from checkout where id = 'checkout-onyx'").get()).toMatchObject({ client_address: null })
  })

  it.each([PRODUCT_ADMIN_STATUS.ARCHIVED, PRODUCT_ADMIN_STATUS.DRAFT])(
    "closes the checkout holding a piece saved as %s and puts the piece back once, however often its expiry is reported",
    async (status) => {
      const editor = await openEditor()
      await holdInCheckout()

      await expect(save(withStatus(editor, status))).resolves.toMatchObject({ closedCheckoutCount: 1 })

      expect(expireSession).toHaveBeenCalledExactlyOnceWith(TRANSACTION_ID)
      expect(readStock()).toStrictEqual({ available: 1, reserved: 0 })
      expect(readCheckoutStatuses()).toStrictEqual({ checkout: "failed", payment: "failed" })

      await expect(releaseHeldPiece()).resolves.toBe(false)

      expect(readStock()).toStrictEqual({ available: 1, reserved: 0 })
    },
  )

  it("leaves the checkout open while the piece stays on sale", async () => {
    const editor = await openEditor()
    await holdInCheckout()

    await expect(save(renamed(editor))).resolves.toMatchObject({ closedCheckoutCount: 0 })

    expect(expireSession).not.toHaveBeenCalled()
    expect(readStock()).toStrictEqual({ available: 0, reserved: 1 })
    expect(readCheckoutStatuses()).toStrictEqual({ checkout: "pending", payment: "pending" })
  })

  it("closes nothing and keeps the piece reserved when Stripe will not expire a session paid a moment earlier", async () => {
    const editor = await openEditor()
    await holdInCheckout()
    vi.spyOn(console, "error").mockImplementation(() => {})
    expireSession.mockRejectedValueOnce(new Error('Only Checkout Sessions with a status in ["open"] can be expired.'))

    await expect(save(withStatus(editor, PRODUCT_ADMIN_STATUS.ARCHIVED))).resolves.toMatchObject({ closedCheckoutCount: 0 })

    expect(readStock()).toStrictEqual({ available: 0, reserved: 1 })
    expect(readCheckoutStatuses()).toStrictEqual({ checkout: "pending", payment: "pending" })

    await sellHeldPiece()

    expect(readStock()).toStrictEqual({ available: 0, reserved: 0 })
  })

  it("leaves alone a checkout paying for another piece", async () => {
    const editor = await openEditor()
    sqlite.exec(`
      insert into product (id, handle, status, titles) values ('product-pearl', 'pearl-ring', 'published', '{"en-US":"Pearl ring"}');
      insert into product_variant (id, product_id, title, price, sku) values ('variant-pearl', 'product-pearl', 'Default', 18900, 'PEARL-1');
      insert into inventory (id, variant_id, quantity_available, quantity_reserved) values ('inventory-pearl', 'variant-pearl', 0, 1);
      insert into checkout (id, email, status) values ('checkout-pearl', 'ewa@example.com', 'pending');
      insert into payment (id, checkout_id, amount, provider, status, transaction_id, reserved_lines)
        values ('payment-pearl', 'checkout-pearl', 18900, 'stripe', 'pending', 'cs_pearl', '[{"qty":1,"variantId":"variant-pearl"}]');
    `)

    await expect(save(withStatus(editor, PRODUCT_ADMIN_STATUS.ARCHIVED))).resolves.toMatchObject({ closedCheckoutCount: 0 })

    expect(expireSession).not.toHaveBeenCalled()
    expect(sqlite.prepare("select status from payment where transaction_id = 'cs_pearl'").get()).toMatchObject({ status: "pending" })
  })
})
