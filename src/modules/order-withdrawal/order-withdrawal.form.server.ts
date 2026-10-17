import { Buffer } from "node:buffer"
import { type Attachment } from "resend"

import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

export const loadWithdrawalFormAttachment = async (seller: StoreSetting["storedSellerDetails"], origin: string): Promise<Attachment> => {
  const [{ loadFormFonts }, { WITHDRAWAL_FORM }] = await Promise.all([
    import("~/src/modules/content-page/content-page.forms.server"),
    import("~/src/presentation/pdf/withdrawal-form"),
  ])

  return {
    content: Buffer.from(await WITHDRAWAL_FORM.render(seller, await loadFormFonts(origin))).toString("base64"),
    contentType: "application/pdf",
    filename: WITHDRAWAL_FORM.fileName,
  }
}
