import { readFileSync } from "node:fs"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"

import { FORM_FONT_PATHS, type FormFonts } from "~/src/presentation/pdf/form-document"

export const readPublicAsset = (path: string): Uint8Array<ArrayBuffer> => new Uint8Array(readFileSync(`public${path}`))

export const FORM_FONT_FILES: FormFonts = {
  sans: readPublicAsset(FORM_FONT_PATHS.sans),
  sansSemiBold: readPublicAsset(FORM_FONT_PATHS.sansSemiBold),
  serifSemiBold: readPublicAsset(FORM_FONT_PATHS.serifSemiBold),
}

interface PlacedText {
  readonly left: number
  readonly text: string
  readonly top: number
}

export interface ReadPdf {
  readonly info: object
  readonly lines: readonly string[]
  readonly lowestBaseline: number
  readonly pageCount: number
  readonly pageSize: readonly number[]
}

const toLines = (texts: readonly PlacedText[]): string[] =>
  [...Map.groupBy(texts, ({ top }) => Math.round(top)).entries()]
    .toSorted(([upper], [lower]) => upper - lower)
    .map(([, row]) =>
      row
        .toSorted((first, second) => first.left - second.left)
        .map(({ text }) => text)
        .join("")
        .replaceAll(/\s+/gu, " ")
        .trim(),
    )

export const readPdf = async (bytes: Uint8Array): Promise<ReadPdf> => {
  const document = await getDocument({ data: new Uint8Array(bytes) }).promise
  const page = await document.getPage(1)
  const pageHeight = page.getViewport({ scale: 1 }).height
  const { items } = await page.getTextContent()
  const texts = items.flatMap((item) =>
    "str" in item && item.str !== ""
      ? [{ left: Number(item.transform[4]), text: item.str, top: pageHeight - Number(item.transform[5]) }]
      : [],
  )
  const { info } = await document.getMetadata()

  return {
    info,
    lines: toLines(texts),
    lowestBaseline: Math.max(...texts.map(({ top }) => top)),
    pageCount: document.numPages,
    pageSize: page.view,
  }
}
