import { describe, expect, it } from "vite-plus/test"

import { buildAuditChangeMetadata, formatAuditDetailFromChanges, toAuditMetadataRecord } from "~/src/modules/audit-log/audit-log.diff.utils"

describe("buildAuditChangeMetadata", () => {
  it("records nothing when no watched field moved", () => {
    expect(buildAuditChangeMetadata({ status: "draft" }, { status: "draft" }, ["status"])).toBeUndefined()
  })

  it("records only the fields it was asked to watch", () => {
    const metadata = buildAuditChangeMetadata({ rank: 1, status: "draft" }, { rank: 2, status: "published" }, ["status"])

    expect(metadata).toStrictEqual({ changed: ["status"], new: { status: "published" }, old: { status: "draft" } })
  })

  it("records several changed fields in the order they were watched", () => {
    const metadata = buildAuditChangeMetadata({ rank: 1, status: "draft" }, { rank: 2, status: "published" }, ["status", "rank"])

    expect(metadata?.changed).toStrictEqual(["status", "rank"])
  })

  it("treats NaN as unchanged rather than always different", () => {
    expect(buildAuditChangeMetadata({ total: Number.NaN }, { total: Number.NaN }, ["total"])).toBeUndefined()
  })

  it("distinguishes zero from negative zero", () => {
    expect(buildAuditChangeMetadata({ total: 0 }, { total: -0 }, ["total"])?.changed).toStrictEqual(["total"])
  })

  it("compares object values by identity, not structurally", () => {
    const shared = { locale: "pl-PL" }

    expect(buildAuditChangeMetadata({ meta: shared }, { meta: shared }, ["meta"])).toBeUndefined()
    expect(buildAuditChangeMetadata({ meta: { locale: "pl-PL" } }, { meta: { locale: "pl-PL" } }, ["meta"])?.changed).toStrictEqual([
      "meta",
    ])
  })

  it("records nothing when there is nothing to watch", () => {
    expect(buildAuditChangeMetadata({ status: "draft" }, { status: "published" }, [])).toBeUndefined()
  })
})

describe("formatAuditDetailFromChanges", () => {
  it("renders each change with its label and an arrow", () => {
    expect(
      formatAuditDetailFromChanges({ status: "Status" }, { changed: ["status"], new: { status: "published" }, old: { status: "draft" } }),
    ).toBe("Status: draft → published")
  })

  it("joins several changes with a semicolon", () => {
    expect(
      formatAuditDetailFromChanges(
        { rank: "Rank", status: "Status" },
        { changed: ["status", "rank"], new: { rank: 2, status: "published" }, old: { rank: 1, status: "draft" } },
      ),
    ).toBe("Status: draft → published; Rank: 1 → 2")
  })

  it("falls back to the field name when no label was configured", () => {
    expect(formatAuditDetailFromChanges({}, { changed: ["handle"], new: { handle: "b" }, old: { handle: "a" } })).toBe("handle: a → b")
  })

  it("renders a value that appears for the first time as undefined", () => {
    expect(formatAuditDetailFromChanges({}, { changed: ["sku"], new: { sku: "SR-1" }, old: {} })).toBe("sku: undefined → SR-1")
  })

  it("renders nothing for an empty change list", () => {
    expect(formatAuditDetailFromChanges({}, { changed: [], new: {}, old: {} })).toBe("")
  })
})

describe("toAuditMetadataRecord", () => {
  it("keeps the changed list beside the old and new values", () => {
    expect(toAuditMetadataRecord({ changed: ["status"], new: { status: "published" }, old: { status: "draft" } })).toStrictEqual({
      changed: ["status"],
      new: { status: "published" },
      old: { status: "draft" },
    })
  })
})
