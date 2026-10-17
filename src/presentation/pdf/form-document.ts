import fontkit from "@pdf-lib/fontkit"
import { type Color, PDFDocument, type PDFFont, type PDFPage, PageSizes, rgb, setCharacterSpacing } from "pdf-lib"

import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

import { APP_DOMAIN, APP_NAME } from "~/src/presentation/branding/app"

export interface FormFonts {
  readonly sans: Uint8Array
  readonly sansSemiBold: Uint8Array
  readonly serifSemiBold: Uint8Array
}

export const FORM_FONT_PATHS = {
  sans: "/fonts/forms/manrope-400-normal.ttf",
  sansSemiBold: "/fonts/forms/manrope-600-normal.ttf",
  serifSemiBold: "/fonts/forms/cormorant-garamond-600-normal.ttf",
} as const satisfies Record<keyof FormFonts, string>

export interface FormTemplate {
  readonly fileName: string
  readonly render: (seller: StoreSetting["storedSellerDetails"], fonts: FormFonts) => Promise<Uint8Array<ArrayBuffer>>
}

type FontName = keyof FormFonts

type TextBlockKind = "contact" | "eyebrow" | "footnote" | "lead" | "remark" | "section" | "title"

interface FormChoice {
  readonly amountUnit?: string
  readonly label: string
}

type FormBlock =
  | Readonly<{ count: number; kind: "writingLines" }>
  | Readonly<{ emphasis?: string; kind: "statement"; text: string }>
  | Readonly<{ kind: "choices"; rows: readonly (readonly FormChoice[])[] }>
  | Readonly<{ kind: "fields"; rows: readonly Readonly<{ label: string; lines: number }>[] }>
  | Readonly<{ kind: "notice"; paragraphs: readonly string[] }>
  | Readonly<{ kind: "signatures"; labels: readonly string[] }>
  | Readonly<{ kind: TextBlockKind; text: string }>

interface TextRun {
  readonly font: FontName
  readonly text: string
}

interface Word extends TextRun {
  readonly space: number
  readonly width: number
}

interface TextStyle {
  readonly color: Color
  readonly font: FontName
  readonly lineHeight: number
  readonly size: number
  readonly tracking: number
}

interface FormCanvas {
  readonly fonts: Readonly<Record<FontName, PDFFont>>
  readonly page: PDFPage
}

interface Placement {
  readonly baseline: number
  readonly left: number
  readonly style: TextStyle
}

const FORM_LANGUAGE = "pl"

const CHANNEL_MAX = 255

const toColor = ({ blue, green, red }: Readonly<{ blue: number; green: number; red: number }>): Color =>
  rgb(red / CHANNEL_MAX, green / CHANNEL_MAX, blue / CHANNEL_MAX)

const COLOR = {
  body: toColor({ blue: 60, green: 64, red: 68 }),
  heading: toColor({ blue: 36, green: 37, red: 41 }),
  ink: toColor({ blue: 23, green: 25, red: 28 }),
  muted: toColor({ blue: 78, green: 83, red: 87 }),
  noticeBorder: toColor({ blue: 209, green: 211, red: 214 }),
  noticeFill: toColor({ blue: 249, green: 250, red: 250 }),
  rule: toColor({ blue: 158, green: 162, red: 168 }),
  writingLine: toColor({ blue: 108, green: 113, red: 120 }),
}

const [PAGE_WIDTH, PAGE_HEIGHT] = PageSizes.A4

const PAGE = { contentWidth: 482.25, hairline: 0.75, left: 57 }

const CONTENT_RIGHT = PAGE.left + PAGE.contentWidth

const TEXT_FRAME = { left: PAGE.left, width: PAGE.contentWidth }

const HEADER = { baseline: 70.5, brandSize: 19, contentTop: 111.7, domainSize: 8, domainTracking: 0.64, ruleTop: 85.5 }

const STATEMENT = { bullet: "–", indent: 14.2, writingLinePitch: 24 }

const FIELDS = { extraLinePitch: 17.25, labelColumn: 116.25, lineBelowBaseline: 6, nextRowBelowLine: 11.65 }

const CHOICES = {
  amountGap: 6.95,
  amountLineBelowBaseline: 2.3,
  amountWidth: 79.5,
  boxAboveBaseline: 7.9,
  boxRadius: 1.7,
  boxSize: 9,
  columnOffset: 250.1,
  labelIndent: 17.3,
  rowPitch: 20.2,
}

const SIGNATURES = { columnGap: 27.75, labelBelowLine: 11.95 }

const NOTICE = { bottomPadding: 10.1, firstBaseline: 19.1, padding: 12, paragraphPitch: 16, radius: 4.5 }

const TEXT_STYLES: Readonly<Record<TextBlockKind | "body" | "signature", TextStyle>> = {
  body: { color: COLOR.ink, font: "sans", lineHeight: 13.5, size: 9.4, tracking: 0 },
  contact: { color: COLOR.ink, font: "sans", lineHeight: 14.3, size: 9.4, tracking: 0 },
  eyebrow: { color: COLOR.muted, font: "sans", lineHeight: 12, size: 8, tracking: 0 },
  footnote: { color: COLOR.ink, font: "sans", lineHeight: 12, size: 8.6, tracking: 0 },
  lead: { color: COLOR.body, font: "sans", lineHeight: 13.5, size: 9.4, tracking: 0 },
  remark: { color: COLOR.body, font: "sans", lineHeight: 12, size: 8.4, tracking: 0 },
  section: { color: COLOR.heading, font: "sansSemiBold", lineHeight: 12, size: 8.4, tracking: 0.67 },
  signature: { color: COLOR.body, font: "sans", lineHeight: 12, size: 8.2, tracking: 0 },
  title: { color: COLOR.ink, font: "serifSemiBold", lineHeight: 24, size: 20, tracking: 0 },
}

const BLOCK_SPACING: Readonly<Record<FormBlock["kind"], Readonly<{ after: number; before: number }>>> = {
  choices: { after: 21.8, before: 0 },
  contact: { after: 21.7, before: 0 },
  eyebrow: { after: 24.8, before: 0 },
  fields: { after: 18.7, before: 0.7 },
  footnote: { after: 18.4, before: 2.15 },
  lead: { after: 27, before: 0 },
  notice: { after: 0, before: 0 },
  remark: { after: 21, before: 0 },
  section: { after: 17.3, before: 0 },
  signatures: { after: 17.7, before: 18.75 },
  statement: { after: 25.6, before: 0.7 },
  title: { after: 19.5, before: 0 },
  writingLines: { after: 21.8, before: 1.4 },
}

const measure = (font: PDFFont, text: string, { size, tracking }: TextStyle): number =>
  font.widthOfTextAtSize(text, size) + tracking * text.length

const drawRun = (canvas: FormCanvas, { font, text }: TextRun, { baseline, left, style }: Placement): void => {
  canvas.page.pushOperators(setCharacterSpacing(style.tracking))
  canvas.page.drawText(text, { color: style.color, font: canvas.fonts[font], size: style.size, x: left, y: PAGE_HEIGHT - baseline })
}

const toWords = (canvas: FormCanvas, runs: readonly TextRun[], style: TextStyle): Word[] =>
  runs.flatMap(({ font, text }) => {
    const space = measure(canvas.fonts[font], " ", style)

    return text.split(" ").map((word) => ({ font, space, text: word, width: measure(canvas.fonts[font], word, style) }))
  })

const breakLines = (words: readonly Word[], width: number): Word[][] => {
  const lines: Word[][] = []
  let lineWidth = 0
  for (const word of words) {
    const line = lines.at(-1)
    if (line !== undefined && lineWidth + word.space + word.width <= width) {
      line.push(word)
      lineWidth += word.space + word.width
    } else {
      lines.push([word])
      lineWidth = word.width
    }
  }

  return lines
}

const layoutText = (canvas: FormCanvas, text: string, { style, width }: Readonly<{ style: TextStyle; width: number }>): Word[][] =>
  text.split("\n").flatMap((paragraph) => breakLines(toWords(canvas, [{ font: style.font, text: paragraph }], style), width))

const toSegments = (line: readonly Word[]): Word[] => {
  const segments: Word[] = []
  for (const word of line) {
    const last = segments.at(-1)
    if (last?.font === word.font) {
      segments.splice(-1, 1, { ...last, text: `${last.text} ${word.text}`, width: last.width + word.space + word.width })
    } else {
      segments.push(word)
    }
  }

  return segments
}

const drawLines = (canvas: FormCanvas, lines: readonly (readonly Word[])[], { baseline, left, style }: Placement): number => {
  for (const [index, line] of lines.entries()) {
    toSegments(line).reduce((segmentLeft, segment, segmentIndex) => {
      const start = segmentIndex === 0 ? segmentLeft : segmentLeft + segment.space
      drawRun(canvas, segment, { baseline: baseline + index * style.lineHeight, left: start, style })

      return start + segment.width
    }, left)
  }

  return baseline + (lines.length - 1) * style.lineHeight
}

const drawText = (canvas: FormCanvas, text: string, frame: Placement & Readonly<{ width: number }>): number =>
  drawLines(canvas, layoutText(canvas, text, frame), frame)

const drawRule = (
  canvas: FormCanvas,
  { color, left, right, top }: Readonly<{ color: Color; left: number; right: number; top: number }>,
): void => {
  canvas.page.drawRectangle({ color, height: PAGE.hairline, width: right - left, x: left, y: PAGE_HEIGHT - top - PAGE.hairline })
}

const roundedRectanglePath = (width: number, height: number, radius: number): string =>
  [
    `M ${radius} 0 H ${width - radius} A ${radius} ${radius} 0 0 1 ${width} ${radius}`,
    `V ${height - radius} A ${radius} ${radius} 0 0 1 ${width - radius} ${height}`,
    `H ${radius} A ${radius} ${radius} 0 0 1 0 ${height - radius}`,
    `V ${radius} A ${radius} ${radius} 0 0 1 ${radius} 0 Z`,
  ].join(" ")

const drawHeader = (canvas: FormCanvas): void => {
  const domainStyle = { ...TEXT_STYLES.eyebrow, size: HEADER.domainSize, tracking: HEADER.domainTracking }
  const domain = APP_DOMAIN.toLocaleUpperCase(FORM_LANGUAGE)
  drawRun(
    canvas,
    { font: "serifSemiBold", text: APP_NAME },
    { baseline: HEADER.baseline, left: PAGE.left, style: { ...TEXT_STYLES.title, size: HEADER.brandSize } },
  )
  drawRun(
    canvas,
    { font: "sans", text: domain },
    { baseline: HEADER.baseline, left: CONTENT_RIGHT - measure(canvas.fonts.sans, domain, domainStyle), style: domainStyle },
  )
  drawRule(canvas, { color: COLOR.rule, left: PAGE.left, right: CONTENT_RIGHT, top: HEADER.ruleTop })
}

const drawStatement = (canvas: FormCanvas, { emphasis, text }: Readonly<{ emphasis?: string; text: string }>, top: number): number => {
  const runs: TextRun[] =
    emphasis === undefined
      ? [{ font: "sans", text }]
      : [
          { font: "sans", text },
          { font: "sansSemiBold", text: emphasis },
        ]
  drawRun(canvas, { font: "sans", text: STATEMENT.bullet }, { baseline: top, left: PAGE.left, style: TEXT_STYLES.body })

  return drawLines(canvas, breakLines(toWords(canvas, runs, TEXT_STYLES.body), PAGE.contentWidth - STATEMENT.indent), {
    baseline: top,
    left: PAGE.left + STATEMENT.indent,
    style: TEXT_STYLES.body,
  })
}

const drawWritingLines = (canvas: FormCanvas, count: number, top: number): number => {
  for (const lineTop of Array.from({ length: count }, (_, index) => top + index * STATEMENT.writingLinePitch)) {
    drawRule(canvas, { color: COLOR.writingLine, left: PAGE.left + STATEMENT.indent, right: CONTENT_RIGHT, top: lineTop })
  }

  return top + (count - 1) * STATEMENT.writingLinePitch
}

const drawField = (canvas: FormCanvas, { label, lines }: Readonly<{ label: string; lines: number }>, top: number): number => {
  const firstLineTop = top + FIELDS.lineBelowBaseline
  drawText(canvas, label, { baseline: top, left: PAGE.left, style: TEXT_STYLES.body, width: FIELDS.labelColumn })
  for (const lineTop of Array.from({ length: lines }, (_, index) => firstLineTop + index * FIELDS.extraLinePitch)) {
    drawRule(canvas, { color: COLOR.writingLine, left: PAGE.left + FIELDS.labelColumn, right: CONTENT_RIGHT, top: lineTop })
  }

  return firstLineTop + (lines - 1) * FIELDS.extraLinePitch
}

const drawFields = (canvas: FormCanvas, rows: readonly Readonly<{ label: string; lines: number }>[], top: number): number =>
  rows.reduce((cursor, row, index) => drawField(canvas, row, index === 0 ? cursor : cursor + FIELDS.nextRowBelowLine), top)

const drawCheckbox = (canvas: FormCanvas, left: number, baseline: number): void => {
  canvas.page.drawSvgPath(roundedRectanglePath(CHOICES.boxSize, CHOICES.boxSize, CHOICES.boxRadius), {
    borderColor: COLOR.body,
    borderWidth: PAGE.hairline,
    x: left,
    y: PAGE_HEIGHT - baseline + CHOICES.boxAboveBaseline,
  })
}

const drawChoice = (canvas: FormCanvas, { amountUnit, label }: FormChoice, { baseline, left }: Omit<Placement, "style">): void => {
  const labelLeft = left + CHOICES.labelIndent
  drawCheckbox(canvas, left, baseline)
  drawRun(canvas, { font: "sans", text: label }, { baseline, left: labelLeft, style: TEXT_STYLES.body })
  if (amountUnit !== undefined) {
    const amountLeft = labelLeft + measure(canvas.fonts.sans, label, TEXT_STYLES.body) + CHOICES.amountGap
    const amountRight = amountLeft + CHOICES.amountWidth
    drawRule(canvas, { color: COLOR.writingLine, left: amountLeft, right: amountRight, top: baseline + CHOICES.amountLineBelowBaseline })
    drawRun(canvas, { font: "sans", text: amountUnit }, { baseline, left: amountRight + CHOICES.amountGap, style: TEXT_STYLES.body })
  }
}

const drawChoices = (canvas: FormCanvas, rows: readonly (readonly FormChoice[])[], top: number): number =>
  rows.reduce((baseline, row, rowIndex) => {
    const rowBaseline = rowIndex === 0 ? baseline : baseline + CHOICES.rowPitch
    for (const [columnIndex, choice] of row.entries()) {
      drawChoice(canvas, choice, { baseline: rowBaseline, left: PAGE.left + columnIndex * CHOICES.columnOffset })
    }

    return rowBaseline
  }, top)

const drawSignatures = (canvas: FormCanvas, labels: readonly string[], top: number): number => {
  const columnWidth = (PAGE.contentWidth - SIGNATURES.columnGap * (labels.length - 1)) / labels.length
  for (const [index, label] of labels.entries()) {
    const left = PAGE.left + index * (columnWidth + SIGNATURES.columnGap)
    drawRule(canvas, { color: COLOR.writingLine, left, right: left + columnWidth, top })
    drawRun(canvas, { font: "sans", text: label }, { baseline: top + SIGNATURES.labelBelowLine, left, style: TEXT_STYLES.signature })
  }

  return top + SIGNATURES.labelBelowLine
}

const drawNotice = (canvas: FormCanvas, paragraphs: readonly string[], top: number): number => {
  const style = TEXT_STYLES.signature
  const left = PAGE.left + NOTICE.padding
  const layout = paragraphs.map((paragraph) =>
    layoutText(canvas, paragraph, { style, width: PAGE.contentWidth - NOTICE.padding - NOTICE.padding }),
  )
  const textHeight = layout.reduce(
    (height, lines, index) => height + (index === 0 ? 0 : NOTICE.paragraphPitch) + (lines.length - 1) * style.lineHeight,
    0,
  )
  const bottom = top + NOTICE.firstBaseline + textHeight + NOTICE.bottomPadding
  canvas.page.drawSvgPath(roundedRectanglePath(PAGE.contentWidth, bottom - top, NOTICE.radius), {
    borderColor: COLOR.noticeBorder,
    borderWidth: PAGE.hairline,
    color: COLOR.noticeFill,
    x: PAGE.left,
    y: PAGE_HEIGHT - top,
  })
  layout.reduce(
    (baseline, lines, index) =>
      drawLines(canvas, lines, { baseline: index === 0 ? baseline : baseline + NOTICE.paragraphPitch, left, style }),
    top + NOTICE.firstBaseline,
  )

  return bottom
}

const drawBlock = (canvas: FormCanvas, block: FormBlock, top: number): number => {
  switch (block.kind) {
    case "choices": {
      return drawChoices(canvas, block.rows, top)
    }
    case "fields": {
      return drawFields(canvas, block.rows, top)
    }
    case "notice": {
      return drawNotice(canvas, block.paragraphs, top)
    }
    case "section": {
      return drawText(canvas, block.text.toLocaleUpperCase(FORM_LANGUAGE), { ...TEXT_FRAME, baseline: top, style: TEXT_STYLES.section })
    }
    case "signatures": {
      return drawSignatures(canvas, block.labels, top)
    }
    case "statement": {
      return drawStatement(canvas, block, top)
    }
    case "writingLines": {
      return drawWritingLines(canvas, block.count, top)
    }
    case "contact":
    case "eyebrow":
    case "footnote":
    case "lead":
    case "remark":
    case "title": {
      return drawText(canvas, block.text, { ...TEXT_FRAME, baseline: top, style: TEXT_STYLES[block.kind] })
    }
  }
}

export const renderFormDocument = async ({
  blocks,
  fonts,
  revisedAt,
  title,
}: Readonly<{ blocks: readonly FormBlock[]; fonts: FormFonts; revisedAt: Date; title: string }>): Promise<Uint8Array<ArrayBuffer>> => {
  const document = await PDFDocument.create()
  document.registerFontkit(fontkit)
  const embed = (bytes: Uint8Array) => document.embedFont(bytes, { subset: true })
  const [sans, sansSemiBold, serifSemiBold] = await Promise.all([embed(fonts.sans), embed(fonts.sansSemiBold), embed(fonts.serifSemiBold)])
  const canvas = { fonts: { sans, sansSemiBold, serifSemiBold }, page: document.addPage([PAGE_WIDTH, PAGE_HEIGHT]) }
  drawHeader(canvas)
  blocks.reduce((cursor, block) => {
    const spacing = BLOCK_SPACING[block.kind]

    return drawBlock(canvas, block, cursor + spacing.before) + spacing.after
  }, HEADER.contentTop)
  document.setTitle(`${title} – ${APP_NAME}`, { showInWindowTitleBar: true })
  document.setLanguage(FORM_LANGUAGE)
  document.setCreator(APP_NAME)
  document.setCreationDate(revisedAt)
  document.setModificationDate(revisedAt)

  return new Uint8Array(await document.save())
}
