import { type CSSProperties } from "react"

import { type MarkdownProps } from "react-email"

export const EMAIL_COLOR_CREAM = "#f3f0ea"

export const EMAIL_COLOR_INK = "#16140f"

export const EMAIL_COLOR_LINE = "#e2ddd4"

export const EMAIL_COLOR_PAPER = "#ffffff"

export const EMAIL_COLOR_WASH = "#faf8f5"

export const EMAIL_BODY_STYLE: CSSProperties = {
  backgroundColor: EMAIL_COLOR_CREAM,
  margin: 0,
  padding: "24px 12px",
}

export const EMAIL_CONTAINER_STYLE: CSSProperties = {
  backgroundColor: EMAIL_COLOR_PAPER,
  border: `1px solid ${EMAIL_COLOR_LINE}`,
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px 24px",
}

export const EMAIL_HIGHLIGHT_BOX_STYLE: CSSProperties = {
  backgroundColor: EMAIL_COLOR_WASH,
  border: `1px solid ${EMAIL_COLOR_LINE}`,
  margin: "24px 0",
  padding: "20px 20px",
}

export const EMAIL_PRODUCT_IMAGE_STYLE: CSSProperties = {
  border: `1px solid ${EMAIL_COLOR_LINE}`,
  display: "block",
  objectFit: "cover",
}

const EMAIL_SERIF_FONT = "Georgia, Cambria, 'Times New Roman', Times, serif"

const EMAIL_BODY_TEXT_STYLE: CSSProperties = {
  fontSize: "15px",
  lineHeight: "26px",
}

export const EMAIL_MARKDOWN_CONTAINER_STYLE: CSSProperties = {
  color: EMAIL_COLOR_INK,
  marginTop: "30px",
}

export const EMAIL_MARKDOWN_STYLES: NonNullable<MarkdownProps["markdownCustomStyles"]> = {
  blockQuote: { borderLeft: `2px solid ${EMAIL_COLOR_LINE}`, margin: "20px 0", padding: "0 0 0 16px" },
  bold: { fontWeight: 600 },
  h2: { fontFamily: EMAIL_SERIF_FONT, fontSize: "22px", fontWeight: 400, lineHeight: "30px", margin: "32px 0 12px", paddingTop: 0 },
  h3: {
    fontSize: "12px",
    fontWeight: 600,
    letterSpacing: "0.2em",
    lineHeight: "18px",
    margin: "28px 0 10px",
    paddingTop: 0,
    textTransform: "uppercase",
  },
  hr: { border: "none", borderTop: `1px solid ${EMAIL_COLOR_LINE}`, margin: "28px 0" },
  li: EMAIL_BODY_TEXT_STYLE,
  link: { color: EMAIL_COLOR_INK, textDecoration: "underline" },
  ol: { margin: "0 0 16px", paddingLeft: "22px" },
  p: { ...EMAIL_BODY_TEXT_STYLE, margin: "0 0 16px" },
  ul: { margin: "0 0 16px", paddingLeft: "22px" },
}
