import { describe, expect, it } from "vite-plus/test"

import {
  TABLE_EXPORT_FORMATS,
  TABLE_EXPORT_MIME_TYPES,
  buildTableExportFileName,
  serializeTableExport,
  serializeTableExportCsv,
  serializeTableExportJson,
  serializeTableExportText,
  serializeTableExportXml,
} from "~/src/presentation/components/custom/datagrid/lib/table-export"

import { TEXT_LABELS, auditExportDocument } from "./table-export.fixtures"

describe("TABLE_EXPORT_FORMATS", () => {
  it("offers CSV, JSON, XML and plain text in that order", () => {
    expect(TABLE_EXPORT_FORMATS).toStrictEqual(["csv", "json", "xml", "txt"])
  })
})

describe("TABLE_EXPORT_MIME_TYPES", () => {
  it("names a UTF-8 media type for every format", () => {
    expect(TABLE_EXPORT_MIME_TYPES).toStrictEqual({
      csv: "text/csv;charset=utf-8",
      json: "application/json;charset=utf-8",
      txt: "text/plain;charset=utf-8",
      xml: "application/xml;charset=utf-8",
    })
  })
})

describe("serializeTableExport", () => {
  it.each([
    ["csv", serializeTableExportCsv(auditExportDocument())],
    ["json", serializeTableExportJson(auditExportDocument())],
    ["xml", serializeTableExportXml(auditExportDocument())],
    ["txt", serializeTableExportText(auditExportDocument(), TEXT_LABELS)],
  ] as const)("writes the %s format with its serializer", (format, expected) => {
    expect(serializeTableExport(auditExportDocument(), format, TEXT_LABELS)).toBe(expected)
  })
})

describe("buildTableExportFileName", () => {
  it("names the file after the list and the minute of export on the admin's wall clock", () => {
    expect(buildTableExportFileName(auditExportDocument(), "csv")).toBe("audit-log-2026-10-16-1434.csv")
  })

  it("takes the extension from the format", () => {
    expect(TABLE_EXPORT_FORMATS.map((format) => buildTableExportFileName(auditExportDocument(), format))).toStrictEqual([
      "audit-log-2026-10-16-1434.csv",
      "audit-log-2026-10-16-1434.json",
      "audit-log-2026-10-16-1434.xml",
      "audit-log-2026-10-16-1434.txt",
    ])
  })

  it("dates the file by the admin's zone when it is already the next day there", () => {
    const document = auditExportDocument({ exportedAt: new Date("2026-12-31T23:05:00.000Z"), list: "orders" })

    expect(buildTableExportFileName(document, "json")).toBe("orders-2027-01-01-0005.json")
  })
})
