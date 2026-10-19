import { describe, expect, it } from "vite-plus/test"

import { buildAuditChangeMetadata, toAuditMetadataRecord } from "~/src/modules/audit-log/audit-log.utils"

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

describe("toAuditMetadataRecord", () => {
  it("keeps the changed list beside the old and new values", () => {
    expect(toAuditMetadataRecord({ changed: ["status"], new: { status: "published" }, old: { status: "draft" } })).toStrictEqual({
      changed: ["status"],
      new: { status: "published" },
      old: { status: "draft" },
    })
  })
})
