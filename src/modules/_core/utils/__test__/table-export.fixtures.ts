import { type TableExportDocument, type TableExportTextLabels } from "~/src/modules/_core/utils/table-export"

export const EXPORTED_AT = new Date("2026-10-16T12:34:56.000Z")

export const TEXT_LABELS: TableExportTextLabels = {
  exportedAt: "Wyeksportowano",
  filters: "Filtry",
  noFilters: "brak",
  rowCount: "Liczba wierszy",
}

export const auditExportDocument = (overrides: Partial<TableExportDocument> = {}): TableExportDocument => ({
  columns: [
    { id: "timestamp", label: "Data i czas" },
    { id: "action", label: "Zdarzenie" },
    { id: "target", label: "Podmiot" },
    { id: "ip", label: "IP" },
  ],
  exportedAt: EXPORTED_AT,
  filters: [{ label: "Kategoria", value: "Zamówienia" }],
  formatLocale: "en-US",
  list: "audit-log",
  rows: [
    ["16 paź 2026, 14:30:12", "Złożono zamówienie", "MRT-2026-00042", "203.0.113.7"],
    ["16 paź 2026, 14:31:40", "Wyeksportowano listę zamówień", "12", undefined],
  ],
  timeZone: "Europe/Warsaw",
  title: "Dziennik zdarzeń",
  ...overrides,
})

export const singleCellDocument = (value: string | undefined): TableExportDocument =>
  auditExportDocument({ columns: [{ id: "detail", label: "Szczegóły" }], filters: [], rows: [[value]] })
