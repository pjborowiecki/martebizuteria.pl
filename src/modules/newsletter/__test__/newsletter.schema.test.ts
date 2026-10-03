import { createTableRelationsHelpers, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { NEWSLETTER_EMAIL_MAX_LENGTH, NEWSLETTER_SOURCES, NEWSLETTER_STATUSES } from "~/src/modules/newsletter/newsletter.constants"
import { newsletterSubscriber, newsletterSubscriberRelations } from "~/src/modules/newsletter/newsletter.schema"

const config = getTableConfig(newsletterSubscriber)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

const relationEntries = Object.entries(newsletterSubscriberRelations.config(createTableRelationsHelpers(newsletterSubscriber)))

const references = config.foreignKeys.map((key) => {
  const reference = key.reference()

  return {
    columns: reference.columns.map((column) => column.name),
    foreignColumns: reference.foreignColumns.map((column) => column.name),
    foreignTable: getTableName(reference.foreignTable),
    onDelete: key.onDelete,
  }
})

describe("newsletter_subscriber table", () => {
  it("maps to the table name the migrations use", () => {
    expect(config.name).toBe("newsletter_subscriber")
  })

  it("keys a subscriber by a freshly generated uuid", () => {
    const id = columnByName.get("id")
    const generated: unknown = id?.defaultFn?.()

    expect(id?.primary).toBe(true)
    expect(generated).toHaveLength(UUID_STRING_LENGTH)
    expect(id?.defaultFn?.()).not.toBe(id?.defaultFn?.())
  })

  it("stores any address an email field can hold", () => {
    expect(columnByName.get("email")?.getSQLType()).toBe(`text(${NEWSLETTER_EMAIL_MAX_LENGTH})`)
    expect(columnByName.get("email")?.notNull).toBe(true)
  })

  it("limits status, source and locale to the values the app understands", () => {
    expect(columnByName.get("status")?.enumValues).toStrictEqual([...NEWSLETTER_STATUSES])
    expect(columnByName.get("source")?.enumValues).toStrictEqual([...NEWSLETTER_SOURCES])
    expect(columnByName.get("locale")?.enumValues).toStrictEqual([...I18N.SUPPORTED_LOCALES])
  })

  it("keeps a subscription on record when the customer account behind it is deleted", () => {
    expect(references).toStrictEqual([{ columns: ["user_id"], foreignColumns: ["id"], foreignTable: "user", onDelete: "set null" }])
    expect(columnByName.get("user_id")?.notNull).toBe(false)
  })

  it("lets one address and one token belong to a single subscriber", () => {
    expect(
      config.indexes.map((index) => ({
        columns: index.config.columns.map((column) => ("name" in column ? column.name : column)),
        name: index.config.name,
        unique: index.config.unique,
      })),
    ).toStrictEqual([
      { columns: ["email"], name: "newsletter_subscriber_email_unique", unique: true },
      { columns: ["token"], name: "newsletter_subscriber_token_unique", unique: true },
      { columns: ["status"], name: "newsletter_subscriber_status_idx", unique: false },
    ])
  })
})

describe("newsletter_subscriber relations", () => {
  it("points the subscriber at the customer account it belongs to", () => {
    expect(relationEntries.map(([name, relation]) => [name, getTableName(relation.referencedTable)])).toStrictEqual([["user", "user"]])
  })
})
