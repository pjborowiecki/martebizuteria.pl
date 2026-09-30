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

import {
  createUserAddress,
  deleteUserAddress,
  getDefaultAddressForUser,
  setDefaultUserAddress,
  updateUserAddress,
  upsertDefaultAddressForUser,
} from "~/src/modules/address/address.accessors"

const OWNER = "user-1"

const INTRUDER = "user-2"

const shipping = { address1: "Krucza 1", city: "Warszawa", countryCode: "pl", userId: OWNER }

const countDefaults = (userId: string): number =>
  Number(sqlite.prepare(`select count(*) as total from address where user_id = ? and is_default = 1`).get(userId)?.["total"] ?? 0)

const countAddresses = (userId: string): number =>
  Number(sqlite.prepare(`select count(*) as total from address where user_id = ?`).get(userId)?.["total"] ?? 0)

beforeEach(() => {
  sqlite.exec(`
    drop table if exists address;
    create table address (
      id text primary key, address1 text not null, address2 text, city text not null, country_code text not null,
      first_name text, last_name text, phone text, postal_code text, province text, user_id text,
      is_default integer not null default 0, created_at integer, updated_at integer
    );
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("upsertDefaultAddressForUser", () => {
  it("inserts the customer's first default address", async () => {
    await upsertDefaultAddressForUser(shipping)

    const stored = await getDefaultAddressForUser(OWNER)

    expect(stored).toMatchObject({ address1: "Krucza 1", city: "Warszawa", isDefault: true, userId: OWNER })
  })

  it("uppercases the country code so it matches the ISO column", async () => {
    await upsertDefaultAddressForUser(shipping)

    const stored = await getDefaultAddressForUser(OWNER)

    expect(stored?.countryCode).toBe("PL")
  })

  it("updates the existing default rather than adding a second one", async () => {
    await upsertDefaultAddressForUser(shipping)
    await upsertDefaultAddressForUser({ ...shipping, address1: "Miodowa 7", city: "Kraków" })

    const stored = await getDefaultAddressForUser(OWNER)

    expect(countAddresses(OWNER)).toBe(1)
    expect(stored?.address1).toBe("Miodowa 7")
  })

  it("leaves the optional columns unset when the caller supplies blanks", async () => {
    await upsertDefaultAddressForUser({ ...shipping, address2: "", postalCode: "", province: "" })

    const stored = await getDefaultAddressForUser(OWNER)

    expect(stored?.address2).toBeNull()
    expect(stored?.postalCode).toBeNull()
    expect(stored?.province).toBeNull()
  })

  it("stores the optional columns when they carry content", async () => {
    await upsertDefaultAddressForUser({ ...shipping, address2: "m. 4", postalCode: "00-001", province: "Mazowieckie" })

    expect(await getDefaultAddressForUser(OWNER)).toMatchObject({
      address2: "m. 4",
      postalCode: "00-001",
      province: "Mazowieckie",
    })
  })

  it("keeps each customer's default address separate", async () => {
    await upsertDefaultAddressForUser(shipping)
    await upsertDefaultAddressForUser({ ...shipping, address1: "Miodowa 7", userId: INTRUDER })

    const ownerDefault = await getDefaultAddressForUser(OWNER)
    const intruderDefault = await getDefaultAddressForUser(INTRUDER)

    expect(ownerDefault?.address1).toBe("Krucza 1")
    expect(intruderDefault?.address1).toBe("Miodowa 7")
  })

  it("reports no default address for a customer who has none", async () => {
    expect(await getDefaultAddressForUser(OWNER)).toBeUndefined()
  })
})

describe("createUserAddress", () => {
  it("reports when a newly inserted address disappears before it can be read", async () => {
    sqlite.exec("create trigger remove_new_address after insert on address begin delete from address where id = new.id; end")

    await expect(createUserAddress(shipping)).rejects.toThrow("Created address could not be loaded")
  })

  it("returns the row it just wrote", async () => {
    const created = await createUserAddress({ ...shipping, firstName: "Anna", lastName: "Kowalska", phone: "+48123456789" })

    expect(created).toMatchObject({
      address1: "Krucza 1",
      countryCode: "PL",
      firstName: "Anna",
      isDefault: false,
      lastName: "Kowalska",
      phone: "+48123456789",
      userId: OWNER,
    })
  })

  it("defaults a new address to not being the default one", async () => {
    await createUserAddress(shipping)

    expect(countDefaults(OWNER)).toBe(0)
  })

  it("leaves blank optional fields unset", async () => {
    const created = await createUserAddress({ ...shipping, firstName: "", phone: "" })

    expect(created.firstName).toBeNull()
    expect(created.phone).toBeNull()
  })

  it("demotes the previous default when a new default is added", async () => {
    const first = await createUserAddress({ ...shipping, isDefault: true })
    const second = await createUserAddress({ ...shipping, address1: "Miodowa 7", isDefault: true })

    const stored = await getDefaultAddressForUser(OWNER)

    expect(countDefaults(OWNER)).toBe(1)
    expect(stored?.id).toBe(second.id)
    expect(first.id).not.toBe(second.id)
  })

  it("does not touch another customer's default when one is added", async () => {
    await createUserAddress({ ...shipping, isDefault: true, userId: INTRUDER })
    await createUserAddress({ ...shipping, isDefault: true })

    expect(countDefaults(INTRUDER)).toBe(1)
  })
})

describe("updateUserAddress", () => {
  it("replaces populated optional address fields with the submitted values", async () => {
    const created = await createUserAddress({ ...shipping, address2: "Floor 1", phone: "+48123456789" })

    const updated = await updateUserAddress({ address2: "Floor 3", id: created.id, phone: "+48987654321", userId: OWNER })

    expect(updated).toMatchObject({ address2: "Floor 3", phone: "+48987654321" })
  })

  it("refuses an address that belongs to another customer and leaves it untouched", async () => {
    const created = await createUserAddress(shipping)

    expect(await updateUserAddress({ address1: "Miodowa 7", id: created.id, userId: INTRUDER })).toBeUndefined()
    expect(await getDefaultAddressForUser(INTRUDER)).toBeUndefined()
    const reread = await updateUserAddress({ city: "Warszawa", id: created.id, userId: OWNER })

    expect(reread?.address1).toBe("Krucza 1")
  })

  it("throws rather than no-oping when the caller names no field to change", async () => {
    const created = await createUserAddress(shipping)

    await expect(updateUserAddress({ id: created.id, userId: OWNER })).rejects.toThrow("No values to set")
  })

  it("refuses an address that does not exist", async () => {
    expect(await updateUserAddress({ address1: "Miodowa 7", id: "missing", userId: OWNER })).toBeUndefined()
  })

  it("changes only the fields the caller named", async () => {
    const created = await createUserAddress({ ...shipping, firstName: "Anna", postalCode: "00-001" })
    const updated = await updateUserAddress({ city: "Kraków", id: created.id, userId: OWNER })

    expect(updated).toMatchObject({ address1: "Krucza 1", city: "Kraków", firstName: "Anna", postalCode: "00-001" })
  })

  it("changes the street the caller named", async () => {
    const created = await createUserAddress(shipping)

    const updated = await updateUserAddress({ address1: "Miodowa 7", id: created.id, userId: OWNER })

    expect(updated?.address1).toBe("Miodowa 7")
    expect(updated?.city).toBe("Warszawa")
  })

  it("uppercases a changed country code", async () => {
    const created = await createUserAddress(shipping)

    const updated = await updateUserAddress({ countryCode: "de", id: created.id, userId: OWNER })

    expect(updated?.countryCode).toBe("DE")
  })

  it("clears an optional field the caller blanks out", async () => {
    const created = await createUserAddress({ ...shipping, address2: "m. 4", phone: "+48123456789" })
    const updated = await updateUserAddress({ address2: "", id: created.id, phone: "", userId: OWNER })

    expect(updated?.address2).toBeNull()
    expect(updated?.phone).toBeNull()
  })

  it("demotes the previous default when promoting this address", async () => {
    const first = await createUserAddress({ ...shipping, isDefault: true })
    const second = await createUserAddress({ ...shipping, address1: "Miodowa 7" })

    await updateUserAddress({ id: second.id, isDefault: true, userId: OWNER })
    const stored = await getDefaultAddressForUser(OWNER)

    expect(countDefaults(OWNER)).toBe(1)
    expect(stored?.id).toBe(second.id)
    expect(first.id).not.toBe(second.id)
  })

  it("can demote an address without promoting another", async () => {
    const created = await createUserAddress({ ...shipping, isDefault: true })

    await updateUserAddress({ id: created.id, isDefault: false, userId: OWNER })

    expect(countDefaults(OWNER)).toBe(0)
  })
})

describe("deleteUserAddress", () => {
  it("deletes the customer's own address", async () => {
    const created = await createUserAddress(shipping)

    expect(await deleteUserAddress(OWNER, created.id)).toBe(true)
    expect(countAddresses(OWNER)).toBe(0)
  })

  it("refuses an address that belongs to another customer", async () => {
    const created = await createUserAddress(shipping)

    expect(await deleteUserAddress(INTRUDER, created.id)).toBe(false)
    expect(countAddresses(OWNER)).toBe(1)
  })

  it("refuses an address that does not exist", async () => {
    expect(await deleteUserAddress(OWNER, "missing")).toBe(false)
  })
})

describe("setDefaultUserAddress", () => {
  it("promotes the addressed row and demotes the rest", async () => {
    const first = await createUserAddress({ ...shipping, isDefault: true })
    const second = await createUserAddress({ ...shipping, address1: "Miodowa 7" })

    expect(await setDefaultUserAddress(OWNER, second.id)).toBe(true)

    const stored = await getDefaultAddressForUser(OWNER)

    expect(countDefaults(OWNER)).toBe(1)
    expect(stored?.id).toBe(second.id)
    expect(first.id).not.toBe(second.id)
  })

  it("refuses an address that belongs to another customer", async () => {
    const created = await createUserAddress({ ...shipping, isDefault: true })

    expect(await setDefaultUserAddress(INTRUDER, created.id)).toBe(false)
    expect(countDefaults(OWNER)).toBe(1)
  })

  it("refuses an address that does not exist", async () => {
    expect(await setDefaultUserAddress(OWNER, "missing")).toBe(false)
  })

  it("does not demote another customer's default", async () => {
    const intruderAddress = await createUserAddress({ ...shipping, isDefault: true, userId: INTRUDER })
    const ownerAddress = await createUserAddress(shipping)

    await setDefaultUserAddress(OWNER, ownerAddress.id)

    expect(countDefaults(INTRUDER)).toBe(1)
    expect(intruderAddress.isDefault).toBe(true)
  })
})
