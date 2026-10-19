import { describe, expect, it } from "vite-plus/test"

import { parseAdminUserMetadata, serializeAdminUserMetadata } from "~/src/modules/user/user.utils"

describe("parseAdminUserMetadata", () => {
  it.each([[null], [undefined], [""], ["   "]])("reads %j as no metadata", (raw) => {
    expect(parseAdminUserMetadata(raw)).toStrictEqual({})
  })

  it("reads the structured form", () => {
    expect(parseAdminUserMetadata('{"notes":"VIP","tags":["wholesale"]}')).toStrictEqual({ notes: "VIP", tags: ["wholesale"] })
  })

  it("trims the notes and drops them when they are only whitespace", () => {
    expect(parseAdminUserMetadata('{"notes":"  VIP  "}')).toStrictEqual({ notes: "VIP", tags: undefined })
    expect(parseAdminUserMetadata('{"notes":"   "}')).toStrictEqual({ notes: undefined, tags: undefined })
  })

  it("drops blank tags and an entirely blank tag list", () => {
    expect(parseAdminUserMetadata('{"tags":[" wholesale ","  "]}').tags).toStrictEqual(["wholesale"])
    expect(parseAdminUserMetadata('{"tags":["  "]}').tags).toBeUndefined()
    expect(parseAdminUserMetadata('{"tags":[]}').tags).toBeUndefined()
  })

  it("keeps a legacy plain-text note that was stored before the structured form", () => {
    expect(parseAdminUserMetadata("Called about a resize")).toStrictEqual({ notes: "Called about a resize" })
  })

  it("keeps the raw text when the JSON parses but is not the structured shape", () => {
    expect(parseAdminUserMetadata('{"other":1}')).toStrictEqual({ notes: '{"other":1}' })
  })

  it.each(["null", "true", "42", '"VIP"'])("preserves the legacy note %s even when it parses as a JSON primitive", (raw) => {
    expect(parseAdminUserMetadata(raw)).toStrictEqual({ notes: raw })
  })

  it("keeps the raw text when the structured keys are present but the types are wrong", () => {
    expect(parseAdminUserMetadata('{"tags":"wholesale"}')).toStrictEqual({ notes: '{"tags":"wholesale"}' })
  })
})

describe("serializeAdminUserMetadata", () => {
  it("stores nothing when there is neither a note nor a tag", () => {
    expect(serializeAdminUserMetadata({})).toBeUndefined()
    expect(serializeAdminUserMetadata({ notes: "  ", tags: [] })).toBeUndefined()
    expect(serializeAdminUserMetadata({ tags: ["  "] })).toBeUndefined()
  })

  it("stores the trimmed note and tags", () => {
    expect(serializeAdminUserMetadata({ notes: "  VIP  ", tags: [" wholesale "] })).toBe('{"notes":"VIP","tags":["wholesale"]}')
  })

  it("omits the half that is absent", () => {
    expect(serializeAdminUserMetadata({ notes: "VIP" })).toBe('{"notes":"VIP"}')
    expect(serializeAdminUserMetadata({ tags: ["wholesale"] })).toBe('{"tags":["wholesale"]}')
  })

  it("round trips through the parser", () => {
    const metadata = { notes: "VIP", tags: ["wholesale", "repeat"] }

    expect(parseAdminUserMetadata(serializeAdminUserMetadata(metadata))).toStrictEqual(metadata)
  })
})
