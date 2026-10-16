import { describe, expect, it } from "vite-plus/test"

import { serializeTableExportXml } from "~/src/modules/_core/utils/table-export"

import { auditExportDocument, singleCellDocument } from "./table-export.fixtures"

const parseXml = (xml: string): Document => new DOMParser().parseFromString(xml, "application/xml")

const detailElement = (value: string | undefined): string | undefined =>
  serializeTableExportXml(singleCellDocument(value))
    .split("\n")
    .find((line) => line.trimStart().startsWith("<detail"))
    ?.trim()

const RING = "💍"

describe("serializeTableExportXml", () => {
  it("writes a declaration, the export metadata and one element per row and column", () => {
    const document = auditExportDocument({
      columns: [
        { id: "action", label: "Zdarzenie" },
        { id: "ip", label: "IP" },
      ],
      rows: [
        ["Złożono zamówienie", "203.0.113.7"],
        ["Wyeksportowano listę zamówień", undefined],
      ],
    })

    expect(serializeTableExportXml(document)).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<export>",
        "  <metadata>",
        "    <list>audit-log</list>",
        "    <title>Dziennik zdarzeń</title>",
        "    <exportedAt>2026-10-16T12:34:56.000Z</exportedAt>",
        "    <timeZone>Europe/Warsaw</timeZone>",
        "    <rowCount>2</rowCount>",
        "    <filters>",
        "      <filter>",
        "        <label>Kategoria</label>",
        "        <value>Zamówienia</value>",
        "      </filter>",
        "    </filters>",
        "    <columns>",
        "      <column>",
        "        <id>action</id>",
        "        <label>Zdarzenie</label>",
        "      </column>",
        "      <column>",
        "        <id>ip</id>",
        "        <label>IP</label>",
        "      </column>",
        "    </columns>",
        "  </metadata>",
        "  <rows>",
        "    <row>",
        "      <action>Złożono zamówienie</action>",
        "      <ip>203.0.113.7</ip>",
        "    </row>",
        "    <row>",
        "      <action>Wyeksportowano listę zamówień</action>",
        "      <ip/>",
        "    </row>",
        "  </rows>",
        "</export>",
        "",
      ].join("\n"),
    )
  })

  it("closes empty filter and row lists in place", () => {
    const xml = serializeTableExportXml(auditExportDocument({ filters: [], rows: [] }))

    expect(xml).toContain("    <filters/>\n")
    expect(xml).toContain("  <rows/>\n")
  })

  it("escapes the five XML special characters", () => {
    expect(detailElement(`Tom & Jerry <b>"cytat"</b> 'apostrof'`)).toBe(
      "<detail>Tom &amp; Jerry &lt;b&gt;&quot;cytat&quot;&lt;/b&gt; &apos;apostrof&apos;</detail>",
    )
  })

  it("drops characters XML 1.0 does not allow and keeps tabs, line breaks and astral characters", () => {
    const forbidden = [0, 8, 11, 12, 31, 65_534, 65_535].map((codePoint) => String.fromCodePoint(codePoint)).join("")
    const loneSurrogate = String.fromCodePoint(55_296)

    expect(detailElement(`a${forbidden}\tb${loneSurrogate}${RING}`)).toBe(`<detail>a\tb${RING}</detail>`)
  })

  it("writes an empty element for a missing or an empty value", () => {
    expect(detailElement(undefined)).toBe("<detail/>")
    expect(detailElement("")).toBe("<detail/>")
  })

  it("keeps Polish letters as they are", () => {
    expect(detailElement("Zażółć gęślą jaźń")).toBe("<detail>Zażółć gęślą jaźń</detail>")
  })

  it.each([
    ["title-pl-PL", "title-pl-PL"],
    ["title pl", "title_pl"],
    ["1st", "_1st"],
    ["", "_"],
    ["źródło", "źródło"],
  ])("names the element for column %j %j", (id, name) => {
    const xml = serializeTableExportXml(auditExportDocument({ columns: [{ id, label: "Kolumna" }], rows: [["wartość"]] }))

    expect(xml).toContain(`      <${name}>wartość</${name}>`)
  })

  it("produces a document an XML parser reads back without errors", () => {
    const tricky = `<script>&amp;"'${String.fromCodePoint(1)}${RING}\r\nłódź`
    const document = auditExportDocument({
      columns: [
        { id: "1 weird id", label: "A & B" },
        { id: "ip", label: "<IP>" },
      ],
      filters: [{ label: "Szukaj <x>", value: tricky }],
      rows: [[tricky, undefined]],
    })

    const parsed = parseXml(serializeTableExportXml(document))

    expect(parsed.querySelectorAll("parsererror")).toHaveLength(0)
    expect(parsed.querySelector("rows > row > _1_weird_id")?.textContent).toBe(`<script>&amp;"'${RING}\nłódź`)
    expect(parsed.querySelector("filters > filter > label")?.textContent).toBe("Szukaj <x>")
    expect(parsed.querySelectorAll("columns > column")).toHaveLength(2)
  })
})
