import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import deliveryMethodSeed from "~/src/integrations/drizzle-orm/seeds/delivery-methods.sql?raw"

const sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })

const SEEDED_BEFORE = Date.UTC(2026, 5, 1)

const METHOD_ID = {
  COURIER: "019f4a10-0001-7000-8000-000000000002",
  IN_STORE: "019f4a10-0001-7000-8000-000000000003",
  LOCKER: "019f4a10-0001-7000-8000-000000000001",
} as const

const PREVIOUSLY_SEEDED_DESCRIPTIONS = {
  [METHOD_ID.COURIER]: "Kurier InPost, dostawa 1-2 dni robocze.",
  [METHOD_ID.IN_STORE]: "Odbiór osobisty w atelier w Warszawie, gotowe w 24 godziny.",
  [METHOD_ID.LOCKER]: "Odbiór w Paczkomacie InPost, 1-2 dni robocze.",
} as const

const methodsSchema = z.array(z.object({ description: z.string().nullable(), id: z.string(), updatedAt: z.number() }))

const readMethods = () =>
  methodsSchema.parse(sqlite.prepare("select id, description, updated_at as updatedAt from delivery_method order by id").all())

const describeMethod = (id: string, description: string | null): void => {
  sqlite.prepare("update delivery_method set description = ?, updated_at = ? where id = ?").run(description, SEEDED_BEFORE, id)
}

const describeMethodsAsPreviouslySeeded = (): void => {
  for (const [id, description] of Object.entries(PREVIOUSLY_SEEDED_DESCRIPTIONS)) {
    describeMethod(id, description)
  }
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec("delete from delivery_method; delete from courier;")
  sqlite.exec(deliveryMethodSeed)
})

afterAll(() => {
  sqlite.close()
})

describe("the delivery method descriptions migration", () => {
  it("replaces the seeded Warsaw pickup and the 1-2 day transit with the terms of service's Bochnia pickup and InPost transit", () => {
    describeMethodsAsPreviouslySeeded()

    applyMigration(sqlite, MIGRATION.DELIVERY_METHOD_DESCRIPTIONS)

    expect(readMethods().map(({ description, id }) => ({ description, id }))).toStrictEqual([
      { description: "Odbiór w Paczkomacie InPost, doręczenie do 4 dni roboczych od nadania.", id: METHOD_ID.LOCKER },
      { description: "Kurier InPost, doręczenie do 4 dni roboczych od nadania.", id: METHOD_ID.COURIER },
      { description: "Odbiór osobisty w pracowni w Bochni, gotowe najpóźniej z upływem czasu realizacji.", id: METHOD_ID.IN_STORE },
    ])
    expect(readMethods().every(({ updatedAt }) => updatedAt > SEEDED_BEFORE)).toBe(true)
  })

  it("leaves the previously seeded rows described exactly as the seed file now describes them", () => {
    const seeded = readMethods().map(({ description, id }) => ({ description, id }))
    describeMethodsAsPreviouslySeeded()

    applyMigration(sqlite, MIGRATION.DELIVERY_METHOD_DESCRIPTIONS)

    expect(readMethods().map(({ description, id }) => ({ description, id }))).toStrictEqual(seeded)
  })

  it("leaves alone a description the owner has rewritten or cleared", () => {
    describeMethodsAsPreviouslySeeded()
    describeMethod(METHOD_ID.COURIER, "Kurier InPost, wysyłka w dniu zamówienia.")
    describeMethod(METHOD_ID.IN_STORE, null)

    applyMigration(sqlite, MIGRATION.DELIVERY_METHOD_DESCRIPTIONS)

    expect(readMethods().filter(({ id }) => id !== METHOD_ID.LOCKER)).toStrictEqual([
      { description: "Kurier InPost, wysyłka w dniu zamówienia.", id: METHOD_ID.COURIER, updatedAt: SEEDED_BEFORE },
      { description: null, id: METHOD_ID.IN_STORE, updatedAt: SEEDED_BEFORE },
    ])
  })

  it("changes nothing when it runs again", () => {
    describeMethodsAsPreviouslySeeded()
    applyMigration(sqlite, MIGRATION.DELIVERY_METHOD_DESCRIPTIONS)
    const migrated = readMethods()

    applyMigration(sqlite, MIGRATION.DELIVERY_METHOD_DESCRIPTIONS)

    expect(readMethods()).toStrictEqual(migrated)
  })
})
