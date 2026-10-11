import { describe, expect, it } from "vite-plus/test"

import {
  NEWSLETTER_CAMPAIGN_COLUMN_LENGTH,
  NEWSLETTER_CAMPAIGN_VALIDATION_KEYS,
} from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { newsletterCampaignZodSchemas } from "~/src/modules/newsletter-campaign/newsletter-campaign.zod"

const CAMPAIGN_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const letter = ({ body = "New rings are in.", subject = "Autumn pieces" }: { readonly body?: string; readonly subject?: string } = {}) => ({
  bodies: { "en-US": body, "pl-PL": "Nowe pierścionki już są." },
  subjects: { "en-US": subject, "pl-PL": "Jesienne projekty" },
})

const issuesOf = (input: unknown): string[] => {
  const result = newsletterCampaignZodSchemas.composeValues.safeParse(input)

  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe("newsletterCampaignZodSchemas.composeValues", () => {
  it("accepts a letter written in both languages and trims what the owner typed", () => {
    const parsed = newsletterCampaignZodSchemas.composeValues.parse(letter({ body: "  New rings are in.  ", subject: " Autumn pieces " }))

    expect(parsed.subjects["en-US"]).toBe("Autumn pieces")
    expect(parsed.bodies["en-US"]).toBe("New rings are in.")
  })

  it("asks for a subject and a letter in every language", () => {
    expect(issuesOf(letter({ body: "  ", subject: "" }))).toStrictEqual([
      NEWSLETTER_CAMPAIGN_VALIDATION_KEYS.bodyRequired,
      NEWSLETTER_CAMPAIGN_VALIDATION_KEYS.subjectRequired,
    ])
    expect(issuesOf({ bodies: { "pl-PL": "Treść" }, subjects: { "pl-PL": "Temat" } })).toHaveLength(2)
  })

  it("refuses a subject or a letter longer than the composer allows", () => {
    const tooLong = letter({
      body: "a".repeat(NEWSLETTER_CAMPAIGN_COLUMN_LENGTH.body + 1),
      subject: "a".repeat(NEWSLETTER_CAMPAIGN_COLUMN_LENGTH.subject + 1),
    })

    expect(issuesOf(tooLong)).toStrictEqual([
      NEWSLETTER_CAMPAIGN_VALIDATION_KEYS.bodyTooLong,
      NEWSLETTER_CAMPAIGN_VALIDATION_KEYS.subjectTooLong,
    ])
  })

  it.each([
    "Visit [the shop](https://martebizuteria.pl/products).",
    "Write to [us](mailto:kontakt@martebizuteria.pl).",
    "Call [us](tel:+48663150820).",
  ])("accepts %j, a link an inbox can open", (body) => {
    expect(issuesOf(letter({ body }))).toStrictEqual([])
  })

  it.each([
    "Read the [FAQ](/faq).",
    "Visit [the shop](http://martebizuteria.pl).",
    "![pixel](https://tracker.example/p.gif)",
    "[Click](javascript:alert)",
  ])("refuses %j, an image or a link that is not a full https, mailto or tel address", (body) => {
    expect(issuesOf(letter({ body }))).toStrictEqual([NEWSLETTER_CAMPAIGN_VALIDATION_KEYS.bodyUnsupported])
  })
})

describe("newsletterCampaignZodSchemas.sendInput", () => {
  it("carries the id the composer generated with the letter", () => {
    expect(newsletterCampaignZodSchemas.sendInput.parse({ ...letter(), id: CAMPAIGN_ID }).id).toBe(CAMPAIGN_ID)
  })

  it("refuses a send without a uuid to tell it apart from every other campaign", () => {
    expect(newsletterCampaignZodSchemas.sendInput.safeParse({ ...letter(), id: "campaign-1" }).success).toBe(false)
  })
})
