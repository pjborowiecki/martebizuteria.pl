import { describe, expect, it } from "vite-plus/test"

import { serializeTableExportCsv } from "~/src/modules/_core/utils/table-export"

import { auditExportDocument, singleCellDocument } from "./table-export.fixtures"

const BOM = "\uFEFF"

const csvCell = (value: string | undefined): string | undefined => serializeTableExportCsv(singleCellDocument(value)).split("\r\n").at(1)

describe("serializeTableExportCsv", () => {
  it("writes a byte order mark, a header of column labels and one CRLF-terminated record per row", () => {
    expect(serializeTableExportCsv(auditExportDocument())).toBe(
      `${BOM}Data i czas,Zdarzenie,Podmiot,IP\r\n` +
        '"16 paź 2026, 14:30:12",Złożono zamówienie,MRT-2026-00042,203.0.113.7\r\n' +
        '"16 paź 2026, 14:31:40",Wyeksportowano listę zamówień,12,\r\n',
    )
  })

  it("encodes to UTF-8 starting with the EF BB BF byte order mark Excel looks for", () => {
    const bytes = new TextEncoder().encode(serializeTableExportCsv(auditExportDocument()))

    expect(bytes.subarray(0, 3)).toStrictEqual(new Uint8Array([239, 187, 191]))
  })

  it("keeps Polish letters as they are", () => {
    expect(csvCell("Zażółć gęślą jaźń ŁÓDŹ")).toBe("Zażółć gęślą jaźń ŁÓDŹ")
  })

  it("leaves a plain field unquoted", () => {
    expect(csvCell("silver-ring")).toBe("silver-ring")
  })

  it("quotes a field with a comma", () => {
    expect(csvCell("Warszawa, PL")).toBe('"Warszawa, PL"')
  })

  it("quotes a field with a double quote and doubles the quote", () => {
    expect(csvCell('Pierścionek "Aurora"')).toBe('"Pierścionek ""Aurora"""')
  })

  it("quotes a field that spans lines so the line break stays inside the record", () => {
    const csv = serializeTableExportCsv(singleCellDocument("pierwsza\ndruga\r\ntrzecia"))

    expect(csv).toBe(`${BOM}Szczegóły\r\n"pierwsza\ndruga\r\ntrzecia"\r\n`)
  })

  it("writes an empty field for a missing value and for an empty one", () => {
    expect(csvCell(undefined)).toBe("")
    expect(csvCell("")).toBe("")
  })

  it.each([["=SUM(A1:A2)"], ["+48 600 100 200"], ["-2+3"], ["@cmd"]])(
    "turns %j into text so a spreadsheet does not run it as a formula",
    (value) => {
      expect(csvCell(value)).toBe(`'${value}`)
    },
  )

  it("neutralises a leading tab", () => {
    expect(csvCell("\tcmd")).toBe("'\tcmd")
  })

  it("neutralises and quotes a leading carriage return", () => {
    expect(serializeTableExportCsv(singleCellDocument("\rcmd"))).toBe(`${BOM}Szczegóły\r\n"'\rcmd"\r\n`)
  })

  it("leaves a formula character inside a value alone", () => {
    expect(csvCell("a=b+c-d@e")).toBe("a=b+c-d@e")
  })

  it("separates fields with semicolons for a format locale that writes decimals with a comma, as Polish Excel expects", () => {
    expect(serializeTableExportCsv(auditExportDocument({ formatLocale: "pl-PL" }))).toBe(
      `${BOM}Data i czas;Zdarzenie;Podmiot;IP\r\n` +
        "16 paź 2026, 14:30:12;Złożono zamówienie;MRT-2026-00042;203.0.113.7\r\n" +
        "16 paź 2026, 14:31:40;Wyeksportowano listę zamówień;12;\r\n",
    )
  })

  it("quotes a field with a semicolon once semicolons separate the fields", () => {
    const csv = serializeTableExportCsv(
      auditExportDocument({ columns: [{ id: "detail", label: "Szczegóły" }], formatLocale: "pl-PL", rows: [["a; b"]] }),
    )

    expect(csv).toBe(`${BOM}Szczegóły\r\n"a; b"\r\n`)
  })

  it("leaves a semicolon unquoted while commas separate the fields", () => {
    expect(csvCell("a; b")).toBe("a; b")
  })

  it("writes only the header for an empty list", () => {
    expect(serializeTableExportCsv(auditExportDocument({ rows: [] }))).toBe(`${BOM}Data i czas,Zdarzenie,Podmiot,IP\r\n`)
  })
})
