import { DatabaseSync } from "node:sqlite"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistoryBefore } from "~/src/platform/testing/mocks/migrations"

const sqlite = new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true })

const namesSchema = z.array(z.object({ id: z.string(), names: z.string() }))

const readNames = (): Record<string, unknown> =>
  Object.fromEntries(
    namesSchema
      .parse(sqlite.prepare("select id, names from delivery_method order by id").all())
      .map(({ id, names }) => [id, JSON.parse(names)]),
  )

beforeAll(() => {
  applyMigrationHistoryBefore(sqlite, MIGRATION.DELIVERY_METHOD_NAMES)
  sqlite.exec(`
    insert into courier (id, internal_code, name) values ('courier-inpost', 'inpost', 'InPost'), ('courier-atelier', 'marte-atelier', 'Atelier');
    insert into delivery_method (id, api_service_code, courier_id, name, price, type) values
      ('a-locker', 'inpost_locker_standard', 'courier-inpost', 'Paczkomat InPost', 1499, 'locker'),
      ('b-courier', 'inpost_courier_standard', 'courier-inpost', 'Kurier InPost', 1999, 'courier'),
      ('c-pickup', 'marte_atelier_pickup', 'courier-atelier', 'Odbiór w atelier', 0, 'in_store'),
      ('d-renamed', 'inpost_courier_express', 'courier-inpost', 'Kurier ekspresowy', 2999, 'courier');
  `)
  applyMigration(sqlite, MIGRATION.DELIVERY_METHOD_NAMES)
})

afterAll(() => {
  sqlite.close()
})

describe("the delivery method names migration", () => {
  it("keeps every method's Polish name and gives the seeded methods their English names", () => {
    expect(readNames()).toMatchObject({
      "a-locker": { "en-US": "InPost parcel locker", "pl-PL": "Paczkomat InPost" },
      "b-courier": { "en-US": "InPost courier", "pl-PL": "Kurier InPost" },
      "c-pickup": { "en-US": "Pickup at the atelier", "pl-PL": "Odbiór w atelier" },
    })
  })

  it("shows a method the owner named differently under the same name in English until it is translated", () => {
    expect(readNames()["d-renamed"]).toStrictEqual({ "en-US": "Kurier ekspresowy", "pl-PL": "Kurier ekspresowy" })
  })

  it("gives a method added later an empty name in each language until it is named", () => {
    sqlite.exec(
      "insert into delivery_method (id, api_service_code, courier_id, name, price, type) values ('e-new', 'x', 'courier-inpost', 'Nowa', 0, 'courier')",
    )

    expect(readNames()["e-new"]).toStrictEqual({ "en-US": "", "pl-PL": "" })
  })
})
