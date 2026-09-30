import { describe, expect, it } from "vite-plus/test"

import { legal } from "~/src/integrations/fumadocs/fumadocs.config"
import { legalSchema } from "~/src/integrations/fumadocs/fumadocs.schema"

describe("legal document frontmatter", () => {
  it("loads legal files from the collection with the required frontmatter schema", () => {
    expect(legal.docs.dir).toBe("./content/legal")
    expect(legal.docs.schema).toBe(legalSchema)
  })

  it("retains the page metadata and validates the document revision date", () => {
    expect(legalSchema.parse({ description: "Privacy terms", title: "Privacy policy", updated: "2026-09-29" })).toMatchObject({
      description: "Privacy terms",
      title: "Privacy policy",
      updated: "2026-09-29",
    })
  })

  it.each([undefined, "2026-02-30", "29/09/2026", "2026-09-29T12:00:00Z"])("rejects invalid revision date %j", (updated) => {
    expect(legalSchema.safeParse({ title: "Privacy policy", updated }).success).toBe(false)
  })
})
