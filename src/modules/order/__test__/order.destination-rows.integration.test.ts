import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { getAdminOrderDestinationRows } from "~/src/modules/order/order.accessors"
import { describeOrderDestination } from "~/src/modules/order/order.detail.utils"

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

const LOCKER_POINT = JSON.stringify({ buildingNumber: "12", city: "Warszawa", postalCode: "00-640", street: "Mokotowska" })

const describedDestinations = async (orderIds: readonly string[]): Promise<ReadonlyMap<string, string | undefined>> => {
  const rows = await getAdminOrderDestinationRows(orderIds)

  return new Map(rows.map((row) => [row.id, describeOrderDestination(row)]))
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  sqlite.exec(`
    insert into courier (id, internal_code, name) values ('courier-inpost', 'inpost', 'InPost');
    insert into delivery_method (id, api_service_code, courier_id, name, price, type) values
      ('dm-locker', 'inpost_locker_standard', 'courier-inpost', 'Paczkomat InPost', 1299, 'locker'),
      ('dm-courier', 'inpost_courier', 'courier-inpost', 'Kurier InPost', 1999, 'courier');
    insert into address (id, address1, city, country_code, postal_code) values ('address-checkout', 'ul. Krucza 1/4', 'Kraków', 'PL', '30-001');
    insert into checkout (id, email, shipping_address_id) values ('checkout-old', 'old@marte.test', 'address-checkout');
    insert into "order" (id, email, order_number, delivery_method_id, locker_id, locker_point, checkout_id) values
      ('order-locker', 'locker@marte.test', 'MRT-2026-00001', 'dm-locker', 'WAW01A', '${LOCKER_POINT}', null),
      ('order-courier', 'courier@marte.test', 'MRT-2026-00002', 'dm-courier', null, null, null),
      ('order-before-snapshots', 'old@marte.test', 'MRT-2026-00003', 'dm-courier', null, null, 'checkout-old'),
      ('order-elsewhere', 'other@marte.test', 'MRT-2026-00004', 'dm-courier', null, null, null);
    insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, postal_code, type) values
      ('address-locker', 'ul. Długa 5', 'Gdańsk', 'PL', 'Anna', 'Kowalska', 'order-locker', '80-001', 'shipping'),
      ('address-courier', 'ul. Mokotowska 12/4', 'Warszawa', 'PL', 'Ewa', 'Nowak', 'order-courier', '00-640', 'shipping');
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getAdminOrderDestinationRows", () => {
  it("reads where each requested order goes: the locker, the shipping snapshot or the checkout address", async () => {
    await expect(describedDestinations(["order-locker", "order-courier", "order-before-snapshots"])).resolves.toStrictEqual(
      new Map([
        ["order-locker", "Paczkomat InPost: WAW01A, Mokotowska 12, 00-640 Warszawa"],
        ["order-courier", "Kurier InPost: ul. Mokotowska 12/4, 00-640 Warszawa, PL"],
        ["order-before-snapshots", "Kurier InPost: ul. Krucza 1/4, 30-001 Kraków, PL"],
      ]),
    )
  })

  it("reads nothing for orders outside the export", async () => {
    await expect(getAdminOrderDestinationRows([])).resolves.toStrictEqual([])
  })
})
