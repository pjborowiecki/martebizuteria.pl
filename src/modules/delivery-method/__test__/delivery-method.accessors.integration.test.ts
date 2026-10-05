import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { getOfferedDeliveryMethodByIdQuery } from "~/src/modules/delivery-method/delivery-method.accessors"

const EPOCH = Date.UTC(2026, 0, 1)

beforeEach(() => {
  sqlite.exec(`
    drop table if exists delivery_method;
    drop table if exists courier;

    create table courier (
      id text primary key, internal_code text not null unique, is_active integer not null default 1, logo text, name text not null,
      created_at integer not null, updated_at integer not null
    );

    create table delivery_method (
      id text primary key, api_service_code text not null, courier_id text not null, description text,
      is_active integer not null default 1, name text not null, price integer not null, type text not null,
      created_at integer not null, updated_at integer not null
    );

    insert into courier (id, internal_code, is_active, logo, name, created_at, updated_at) values
      ('courier-inpost', 'inpost', 1, null, 'InPost', ${EPOCH}, ${EPOCH}),
      ('courier-dpd', 'dpd', 1, null, 'DPD', ${EPOCH}, ${EPOCH}),
      ('courier-retired', 'retired', 0, null, 'Retired courier', ${EPOCH}, ${EPOCH});

    insert into delivery_method (id, api_service_code, courier_id, description, is_active, name, price, type, created_at, updated_at) values
      ('dm-locker', 'inpost_locker', 'courier-inpost', 'Pickup point', 1, 'InPost locker', 1290, 'locker', ${EPOCH}, ${EPOCH}),
      ('dm-courier', 'inpost_courier', 'courier-inpost', null, 1, 'InPost courier', 1990, 'courier', ${EPOCH}, ${EPOCH}),
      ('dm-retired', 'dpd_classic', 'courier-dpd', null, 0, 'DPD classic', 1990, 'courier', ${EPOCH}, ${EPOCH}),
      ('dm-orphaned', 'retired_courier', 'courier-retired', null, 1, 'Retired courier', 990, 'courier', ${EPOCH}, ${EPOCH});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getOfferedDeliveryMethodByIdQuery", () => {
  it("reads the price and type of a method the checkout offers", async () => {
    await expect(getOfferedDeliveryMethodByIdQuery("dm-locker")).resolves.toStrictEqual({ price: 1290, type: "locker" })
  })

  it("hides a delivery method that was switched off", async () => {
    await expect(getOfferedDeliveryMethodByIdQuery("dm-retired")).resolves.toBeUndefined()
  })

  it("hides an active method whose courier was switched off, as the delivery step does", async () => {
    await expect(getOfferedDeliveryMethodByIdQuery("dm-orphaned")).resolves.toBeUndefined()
  })

  it("reports nothing for an unknown id", async () => {
    await expect(getOfferedDeliveryMethodByIdQuery("dm-missing")).resolves.toBeUndefined()
  })

  it("reads each method by its own id rather than the first offered row", async () => {
    await expect(getOfferedDeliveryMethodByIdQuery("dm-courier")).resolves.toStrictEqual({ price: 1990, type: "courier" })
  })

  it("offers a method again once its courier is switched back on", async () => {
    sqlite.exec(`update courier set is_active = 1 where id = 'courier-retired';`)

    await expect(getOfferedDeliveryMethodByIdQuery("dm-orphaned")).resolves.toStrictEqual({ price: 990, type: "courier" })
  })
})
