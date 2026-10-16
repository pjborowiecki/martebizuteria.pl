import { describe, expect, it } from "vite-plus/test"

import { catalogFilterLabelKey } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-filter-label"

const STATUS_LABEL_KEYS = { active: "statusActive", draft: "statusDraft" } as const

describe("catalogFilterLabelKey", () => {
  it("names the message of a filter value the list knows", () => {
    expect(catalogFilterLabelKey("draft", STATUS_LABEL_KEYS)).toBe("statusDraft")
  })

  it.each([[undefined], ["archived"], [42], ["toString"]])("names nothing for the filter value %j", (value) => {
    expect(catalogFilterLabelKey(value, STATUS_LABEL_KEYS)).toBeUndefined()
  })
})
