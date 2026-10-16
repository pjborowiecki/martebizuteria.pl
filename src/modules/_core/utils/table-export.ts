import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { formatCalendarDateToIsoDate, formatCalendarTime, toCalendarDateTime } from "~/src/modules/_core/utils/datetime"

export const TABLE_EXPORT_FORMATS = ["csv", "json", "xml", "txt"] as const

export type TableExportFormat = (typeof TABLE_EXPORT_FORMATS)[number]

export const TABLE_EXPORT_MIME_TYPES: Readonly<Record<TableExportFormat, string>> = {
  csv: "text/csv;charset=utf-8",
  json: "application/json;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  xml: "application/xml;charset=utf-8",
}

export interface TableExportColumn {
  readonly id: string
  readonly label: string
}

export interface TableExportFilter {
  readonly label: string
  readonly value: string
}

export type TableExportRow = readonly (string | undefined)[]

export interface TableExportDocument {
  readonly columns: readonly TableExportColumn[]
  readonly exportedAt: Date
  readonly filters: readonly TableExportFilter[]
  readonly formatLocale: string
  readonly list: string
  readonly rows: readonly TableExportRow[]
  readonly timeZone: string
  readonly title: string
}

export interface TableExportTextLabels {
  readonly exportedAt: string
  readonly filters: string
  readonly noFilters: string
  readonly rowCount: string
}

const CSV_BYTE_ORDER_MARK = "\uFEFF"

const CSV_LINE_BREAK = "\r\n"

const CSV_NEEDS_QUOTES = /["\r\n]/u

const CSV_SEPARATOR = ","

const CSV_DECIMAL_COMMA_SEPARATOR = ";"

const DECIMAL_SAMPLE = 0.5

const CSV_FORMULA_TRIGGER = /^[=+\-@\t\r]/u

const JSON_INDENT = 2

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>'

const XML_INDENT = "  "

const XML_INVALID_CHARACTERS = /[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu

const XML_NAME_INVALID_CHARACTERS = /[^\p{L}\p{N}_.-]/gu

const XML_NAME_INVALID_START = /^(?![\p{L}_])/u

const TEXT_LINE_BREAKS = /\r\n?|\n/gu

const TEXT_CONTINUATION = "\n  "

const cellsByColumn = <TValue>(
  { columns }: TableExportDocument,
  row: TableExportRow,
  toValue: (value: string | undefined) => TValue,
): [TableExportColumn, TValue][] => columns.map((column, index) => [column, toValue(row[index])])

const csvSeparatorFor = (formatLocale: string): string =>
  new Intl.NumberFormat(formatLocale).formatToParts(DECIMAL_SAMPLE).find((part) => part.type === "decimal")?.value === ","
    ? CSV_DECIMAL_COMMA_SEPARATOR
    : CSV_SEPARATOR

const toCsvField = (value: string | undefined, separator: string): string => {
  if (value === undefined) {
    return ""
  }

  const inert = CSV_FORMULA_TRIGGER.test(value) ? `'${value}` : value

  return inert.includes(separator) || CSV_NEEDS_QUOTES.test(inert) ? `"${inert.replaceAll('"', '""')}"` : inert
}

const toCsvRecord = (fields: TableExportRow, separator: string): string =>
  `${fields.map((field) => toCsvField(field, separator)).join(separator)}${CSV_LINE_BREAK}`

export const serializeTableExportCsv = (document: TableExportDocument): string => {
  const separator = csvSeparatorFor(document.formatLocale)

  return [
    CSV_BYTE_ORDER_MARK,
    toCsvRecord(
      document.columns.map((column) => column.label),
      separator,
    ),
    ...document.rows.map((row) => toCsvRecord(row, separator)),
  ].join("")
}

const toJsonCell = (value: string | undefined): string => value ?? ""

export const serializeTableExportJson = (document: TableExportDocument): string => {
  const { columns, exportedAt, filters, list, rows, timeZone, title } = document
  const metadata: [string, unknown][] = [
    ["list", list],
    ["title", title],
    ["exportedAt", exportedAt.toISOString()],
    ["timeZone", timeZone],
    ["rowCount", rows.length],
    ["filters", filters],
    ["columns", columns],
  ]
  const records = rows.map((row) =>
    Object.fromEntries(cellsByColumn(document, row, toJsonCell).map(([column, value]): [string, string] => [column.id, value])),
  )

  return `${JSON.stringify({ metadata: Object.fromEntries(metadata), rows: records }, undefined, JSON_INDENT)}\n`
}

const escapeXml = (value: string): string =>
  value
    .replaceAll(XML_INVALID_CHARACTERS, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")

const toXmlName = (id: string): string => id.replaceAll(XML_NAME_INVALID_CHARACTERS, "_").replace(XML_NAME_INVALID_START, "_")

type XmlNode =
  | { readonly children: readonly XmlNode[]; readonly name: string }
  | { readonly name: string; readonly text: string | undefined }

const renderXml = (node: XmlNode, depth: number): string => {
  const indent = XML_INDENT.repeat(depth)
  const content = "text" in node ? node.text : node.children.map((child) => renderXml(child, depth + 1)).join("\n")
  if (content === undefined || content === "") {
    return `${indent}<${node.name}/>`
  }

  return "text" in node
    ? `${indent}<${node.name}>${escapeXml(content)}</${node.name}>`
    : `${indent}<${node.name}>\n${content}\n${indent}</${node.name}>`
}

const xmlRecord = (name: string, fields: readonly (readonly [string, string])[]): XmlNode => ({
  children: fields.map(([field, text]) => ({ name: field, text })),
  name,
})

const xmlMetadata = ({ columns, exportedAt, filters, list, rows, timeZone, title }: TableExportDocument): XmlNode => ({
  children: [
    { name: "list", text: list },
    { name: "title", text: title },
    { name: "exportedAt", text: exportedAt.toISOString() },
    { name: "timeZone", text: timeZone },
    { name: "rowCount", text: String(rows.length) },
    {
      children: filters.map((filter) =>
        xmlRecord("filter", [
          ["label", filter.label],
          ["value", filter.value],
        ]),
      ),
      name: "filters",
    },
    {
      children: columns.map((column) =>
        xmlRecord("column", [
          ["id", column.id],
          ["label", column.label],
        ]),
      ),
      name: "columns",
    },
  ],
  name: "metadata",
})

export const serializeTableExportXml = (document: TableExportDocument): string => {
  const rows = document.rows.map((row): XmlNode => ({
    children: cellsByColumn(document, row, (value) => value).map(([column, text]) => ({ name: toXmlName(column.id), text })),
    name: "row",
  }))

  return `${XML_DECLARATION}\n${renderXml({ children: [xmlMetadata(document), { children: rows, name: "rows" }], name: "export" }, 0)}\n`
}

const toTextValue = (value: string | undefined): string =>
  value === undefined || value === "" ? EMPTY_VALUE : value.replaceAll(TEXT_LINE_BREAKS, TEXT_CONTINUATION)

const formatTextExportedAt = ({ exportedAt, timeZone }: TableExportDocument): string => {
  const wallClock = toCalendarDateTime(exportedAt, timeZone)

  return `${formatCalendarDateToIsoDate(wallClock)} ${formatCalendarTime(wallClock)} (${timeZone})`
}

const textFilterLines = ({ filters }: TableExportDocument, labels: TableExportTextLabels): string[] =>
  filters.length === 0
    ? [`${labels.filters}: ${labels.noFilters}`]
    : [`${labels.filters}:`, ...filters.map((filter) => `- ${filter.label}: ${toTextValue(filter.value)}`)]

export const serializeTableExportText = (document: TableExportDocument, labels: TableExportTextLabels): string => {
  const header = [
    document.title,
    `${labels.exportedAt}: ${formatTextExportedAt(document)}`,
    `${labels.rowCount}: ${String(document.rows.length)}`,
    ...textFilterLines(document, labels),
  ].join("\n")
  const records = document.rows.map((row) =>
    cellsByColumn(document, row, toTextValue)
      .map(([column, value]) => `${column.label}: ${value}`)
      .join("\n"),
  )

  return `${[header, ...records].join("\n\n")}\n`
}

const TABLE_EXPORT_SERIALIZERS: Readonly<
  Record<TableExportFormat, (document: TableExportDocument, labels: TableExportTextLabels) => string>
> = {
  csv: serializeTableExportCsv,
  json: serializeTableExportJson,
  txt: serializeTableExportText,
  xml: serializeTableExportXml,
}

export const serializeTableExport = (document: TableExportDocument, format: TableExportFormat, labels: TableExportTextLabels): string =>
  TABLE_EXPORT_SERIALIZERS[format](document, labels)

export const buildTableExportFileName = ({ exportedAt, list, timeZone }: TableExportDocument, format: TableExportFormat): string => {
  const wallClock = toCalendarDateTime(exportedAt, timeZone)

  return `${list}-${formatCalendarDateToIsoDate(wallClock)}-${formatCalendarTime(wallClock, "")}.${format}`
}
