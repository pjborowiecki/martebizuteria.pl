import { env } from "cloudflare:workers"

import { Buffer } from "node:buffer"
import { type Attachment } from "resend"

const WITHDRAWAL_FORM_PATH = "/forms/formularz_zwrotu.pdf"

const WITHDRAWAL_FORM_FILENAME = "formularz_zwrotu.pdf"

export const loadWithdrawalFormAttachment = async (origin: string): Promise<Attachment> => {
  const response = await env.ASSETS.fetch(new URL(WITHDRAWAL_FORM_PATH, origin))
  if (!response.ok) {
    throw new Error(`The withdrawal form ${WITHDRAWAL_FORM_PATH} could not be read from the static assets: HTTP ${response.status}`)
  }

  return {
    content: Buffer.from(await response.arrayBuffer()).toString("base64"),
    contentType: "application/pdf",
    filename: WITHDRAWAL_FORM_FILENAME,
  }
}
