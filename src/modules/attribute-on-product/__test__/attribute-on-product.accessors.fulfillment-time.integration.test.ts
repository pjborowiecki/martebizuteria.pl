import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { getFulfillmentTimeAttributesByVariantId } from "~/src/modules/attribute-on-product/attribute-on-product.accessors"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const FULFILLMENT_TIME_CHOICES = [
  { labels: { "en-US": "5 business days", "pl-PL": "5 dni roboczych" }, value: "5-dni-roboczych" },
  { labels: { "en-US": "3 weeks", "pl-PL": "3 tygodnie" }, value: "3-tygodnie" },
]

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into product (id, handle, status, titles) values
      ('p-ring', 'pierscionek-luna', 'published', '{"pl-PL":"Pierścionek Luna"}'),
      ('p-pendant', 'zawieszka-sol', 'published', '{"pl-PL":"Zawieszka Sol"}'),
      ('p-earrings', 'kolczyki-aurora', 'published', '{"pl-PL":"Kolczyki Aurora"}');
    insert into product_variant (id, product_id, title) values
      ('v-ring-silver', 'p-ring', 'Srebro'),
      ('v-ring-gold', 'p-ring', 'Złoto'),
      ('v-ring-engraved', 'p-ring', 'Grawer'),
      ('v-pendant', 'p-pendant', 'Zawieszka'),
      ('v-earrings', 'p-earrings', 'Kolczyki');
  `)
  sqlite
    .prepare(
      `insert into product_attribute (id, handle, titles, type, allowed_values, created_at, updated_at) values (?, 'czas-realizacji', ?, 'select', ?, 0, 0)`,
    )
    .run("attr-time", JSON.stringify({ "en-US": "Fulfillment Time", "pl-PL": "Czas realizacji" }), JSON.stringify(FULFILLMENT_TIME_CHOICES))
  sqlite
    .prepare(`insert into product_attribute (id, handle, titles, type, created_at, updated_at) values (?, 'material', ?, 'text', 0, 0)`)
    .run("attr-material", JSON.stringify({ "en-US": "Material", "pl-PL": "Materiał" }))
  sqlite.exec(`
    insert into attribute_on_product (id, attribute_id, product_id, variant_id, value, created_at, updated_at) values
      ('ring-time', 'attr-time', 'p-ring', null, '5-dni-roboczych', 0, 0),
      ('ring-gold-time', 'attr-time', 'p-ring', 'v-ring-gold', '3-tygodnie', 0, 0),
      ('ring-engraved-material', 'attr-material', 'p-ring', 'v-ring-engraved', 'złoto', 0, 0),
      ('pendant-material', 'attr-material', 'p-pendant', null, 'srebro', 0, 0),
      ('earrings-time', 'attr-time', 'p-earrings', null, '  ', 0, 0);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getFulfillmentTimeAttributesByVariantId", () => {
  it("reads the time a variant's product page shows: its own, or the product's when it has no attributes of its own", async () => {
    const attributes = await getFulfillmentTimeAttributesByVariantId(["v-ring-silver", "v-ring-gold"])

    expect(attributes).toStrictEqual(
      new Map([
        ["v-ring-silver", { allowedValues: FULFILLMENT_TIME_CHOICES, type: "select", unit: null, value: "5-dni-roboczych" }],
        ["v-ring-gold", { allowedValues: FULFILLMENT_TIME_CHOICES, type: "select", unit: null, value: "3-tygodnie" }],
      ]),
    )
  })

  it.each([
    ["a variant whose own attributes give no time", "v-ring-engraved"],
    ["a product without a time", "v-pendant"],
    ["a blank time", "v-earrings"],
    ["a variant that no longer exists", "v-deleted"],
  ])("gives no time for %s, so the order falls back to § 7", async (_, variantId) => {
    await expect(getFulfillmentTimeAttributesByVariantId([variantId])).resolves.toStrictEqual(new Map())
  })

  it("reads nothing for an order without lines", async () => {
    await expect(getFulfillmentTimeAttributesByVariantId([])).resolves.toStrictEqual(new Map())
  })
})
