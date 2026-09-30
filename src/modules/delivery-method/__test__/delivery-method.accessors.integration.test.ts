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

import { getActiveDeliveryMethodByIdQuery } from "~/src/modules/delivery-method/delivery-method.accessors"

const EPOCH = Date.UTC(2026, 0, 1)

beforeEach(() => {
  sqlite.exec(`
    drop table if exists delivery_method;

    create table delivery_method (
      id text primary key, api_service_code text not null, courier_id text not null, description text,
      is_active integer not null default 1, name text not null, price integer not null, type text not null,
      created_at integer not null, updated_at integer not null
    );

    insert into delivery_method (id, api_service_code, courier_id, description, is_active, name, price, type, created_at, updated_at) values
      ('dm-locker', 'inpost_locker', 'courier-inpost', 'Pickup point', 1, 'InPost locker', 1290, 'locker', ${EPOCH}, ${EPOCH}),
      ('dm-retired', 'dpd_classic', 'courier-dpd', null, 0, 'DPD classic', 1990, 'courier', ${EPOCH}, ${EPOCH});
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("getActiveDeliveryMethodByIdQuery", () => {
  it("reads the active delivery method with the requested id", async () => {
    const method = await getActiveDeliveryMethodByIdQuery("dm-locker")

    expect(method).toMatchObject({
      apiServiceCode: "inpost_locker",
      courierId: "courier-inpost",
      description: "Pickup point",
      id: "dm-locker",
      isActive: true,
      name: "InPost locker",
      price: 1290,
      type: "locker",
    })
  })

  it("hides a delivery method that was switched off", async () => {
    await expect(getActiveDeliveryMethodByIdQuery("dm-retired")).resolves.toBeUndefined()
  })

  it("reports nothing for an unknown id", async () => {
    await expect(getActiveDeliveryMethodByIdQuery("dm-missing")).resolves.toBeUndefined()
  })

  it("reads each method by its own id rather than the first active row", async () => {
    sqlite.exec(`update delivery_method set is_active = 1 where id = 'dm-retired';`)

    const method = await getActiveDeliveryMethodByIdQuery("dm-retired")

    expect(method?.name).toBe("DPD classic")
  })
})
