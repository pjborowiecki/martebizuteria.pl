import { describe, expect, it } from "vite-plus/test"

import { serializeTableExportText } from "~/src/presentation/components/custom/datagrid/lib/table-export"

import { TEXT_LABELS, auditExportDocument, singleCellDocument } from "./table-export.fixtures"

const textRecord = (value: string | undefined): string | undefined =>
  serializeTableExportText(singleCellDocument(value), TEXT_LABELS).split("\n\n").at(1)

describe("serializeTableExportText", () => {
  it("opens with the title, the export time, the row count and the filters, then lists each row as labelled lines", () => {
    expect(serializeTableExportText(auditExportDocument(), TEXT_LABELS)).toBe(
      [
        "Dziennik zdarzeń",
        "Wyeksportowano: 2026-10-16 14:34 (Europe/Warsaw)",
        "Liczba wierszy: 2",
        "Filtry:",
        "- Kategoria: Zamówienia",
        "",
        "Data i czas: 16 paź 2026, 14:30:12",
        "Zdarzenie: Złożono zamówienie",
        "Podmiot: MRT-2026-00042",
        "IP: 203.0.113.7",
        "",
        "Data i czas: 16 paź 2026, 14:31:40",
        "Zdarzenie: Wyeksportowano listę zamówień",
        "Podmiot: 12",
        "IP: —",
        "",
      ].join("\n"),
    )
  })

  it("says so when no filter narrowed the list", () => {
    expect(serializeTableExportText(auditExportDocument({ filters: [] }), TEXT_LABELS)).toContain("\nFiltry: brak\n")
  })

  it("lists every filter on its own line", () => {
    const document = auditExportDocument({
      filters: [
        { label: "Kategoria", value: "Zamówienia" },
        { label: "Wyszukiwanie", value: "anna" },
      ],
    })

    expect(serializeTableExportText(document, TEXT_LABELS)).toContain("Filtry:\n- Kategoria: Zamówienia\n- Wyszukiwanie: anna\n")
  })

  it("writes the time of export on the wall clock of the admin's zone", () => {
    expect(serializeTableExportText(auditExportDocument({ timeZone: "America/New_York" }), TEXT_LABELS)).toContain(
      "Wyeksportowano: 2026-10-16 08:34 (America/New_York)",
    )
  })

  it("shows a dash for a missing or an empty value", () => {
    expect(textRecord(undefined)).toBe("Szczegóły: —\n")
    expect(textRecord("")).toBe("Szczegóły: —\n")
  })

  it("indents the continuation lines of a value that spans lines so the record stays readable", () => {
    expect(textRecord("pierwsza\r\ndruga\rtrzecia\nczwarta")).toBe("Szczegóły: pierwsza\n  druga\n  trzecia\n  czwarta\n")
  })

  it("keeps Polish letters and punctuation as they are", () => {
    expect(textRecord('Zażółć "gęślą" jaźń: 1,5 zł')).toBe('Szczegóły: Zażółć "gęślą" jaźń: 1,5 zł\n')
  })

  it("writes only the header for an empty list", () => {
    expect(serializeTableExportText(auditExportDocument({ filters: [], rows: [] }), TEXT_LABELS)).toBe(
      "Dziennik zdarzeń\nWyeksportowano: 2026-10-16 14:34 (Europe/Warsaw)\nLiczba wierszy: 0\nFiltry: brak\n",
    )
  })
})
