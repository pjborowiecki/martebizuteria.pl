import { describe, expect, it } from "vite-plus/test"

import { serializeTableExportJson } from "~/src/modules/_core/utils/table-export"

import { auditExportDocument, singleCellDocument } from "./table-export.fixtures"

const parse = (json: string): unknown => JSON.parse(json)

describe("serializeTableExportJson", () => {
  it("describes the export in its metadata and keys every row by the stable column ids", () => {
    const json = serializeTableExportJson(auditExportDocument())

    expect(parse(json)).toStrictEqual({
      metadata: {
        columns: [
          { id: "timestamp", label: "Data i czas" },
          { id: "action", label: "Zdarzenie" },
          { id: "target", label: "Podmiot" },
          { id: "ip", label: "IP" },
        ],
        exportedAt: "2026-10-16T12:34:56.000Z",
        filters: [{ label: "Kategoria", value: "Zamówienia" }],
        list: "audit-log",
        rowCount: 2,
        timeZone: "Europe/Warsaw",
        title: "Dziennik zdarzeń",
      },
      rows: [
        { action: "Złożono zamówienie", ip: "203.0.113.7", target: "MRT-2026-00042", timestamp: "16 paź 2026, 14:30:12" },
        { action: "Wyeksportowano listę zamówień", ip: "", target: "12", timestamp: "16 paź 2026, 14:31:40" },
      ],
    })
  })

  it("keeps the cells of a row in the column order", () => {
    expect(serializeTableExportJson(auditExportDocument())).toContain(
      [
        "    {",
        '      "timestamp": "16 paź 2026, 14:30:12",',
        '      "action": "Złożono zamówienie",',
        '      "target": "MRT-2026-00042",',
        '      "ip": "203.0.113.7"',
        "    },",
      ].join("\n"),
    )
  })

  it("pretty-prints with two spaces and ends with a line break", () => {
    const json = serializeTableExportJson(auditExportDocument({ columns: [], filters: [], rows: [] }))

    expect(json).toBe(
      [
        "{",
        '  "metadata": {',
        '    "list": "audit-log",',
        '    "title": "Dziennik zdarzeń",',
        '    "exportedAt": "2026-10-16T12:34:56.000Z",',
        '    "timeZone": "Europe/Warsaw",',
        '    "rowCount": 0,',
        '    "filters": [],',
        '    "columns": []',
        "  },",
        '  "rows": []',
        "}",
        "",
      ].join("\n"),
    )
  })

  it("survives quotes, backslashes, line breaks and Polish letters", () => {
    const value = 'Pierścionek "Aurora"\\ złoty\r\nłańcuszek'

    const json = serializeTableExportJson(singleCellDocument(value))

    expect(parse(json)).toMatchObject({ rows: [{ detail: value }] })
  })
})
