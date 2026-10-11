import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { NEWSLETTER_CAMPAIGN_STATUSES } from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { newsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.schema"

const config = getTableConfig(newsletterCampaign)

const columnByName = new Map(config.columns.map((column) => [column.name, column]))

describe("newsletter_campaign table", () => {
  it("maps to the table name the migration creates", () => {
    expect(config.name).toBe("newsletter_campaign")
  })

  it("records the letter in both languages, where it links to, how far it got and how it ended", () => {
    expect(config.columns.map((column) => column.name).toSorted()).toStrictEqual([
      "bodies",
      "completed_at",
      "created_at",
      "failure",
      "id",
      "last_recipient_id",
      "origin",
      "recipient_count",
      "sent_count",
      "status",
      "subjects",
      "updated_at",
    ])
  })

  it("keys a campaign by the id the composer generated, so a repeated send collides with the first", () => {
    const id = columnByName.get("id")

    expect(id?.primary).toBe(true)
    expect(id?.defaultFn).toBeUndefined()
  })

  it("limits the status to the sending states the queue understands", () => {
    expect(columnByName.get("status")?.enumValues).toStrictEqual([...NEWSLETTER_CAMPAIGN_STATUSES])
  })

  it("starts counting sent letters at zero and leaves the cursor, failure and end empty until they happen", () => {
    expect(columnByName.get("sent_count")?.default).toBe(0)
    expect(columnByName.get("sent_count")?.notNull).toBe(true)
    expect(columnByName.get("last_recipient_id")?.notNull).toBe(false)
    expect(columnByName.get("failure")?.notNull).toBe(false)
    expect(columnByName.get("completed_at")?.notNull).toBe(false)
  })

  it("indexes the creation time the admin list is ordered by", () => {
    expect(config.indexes.map((index) => index.config.name)).toStrictEqual(["newsletter_campaign_createdAt_idx"])
  })
})
