import { NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

export const newsletterTitleKey = (result: Newsletter["tokenResult"]["result"]): "alreadyTitle" | "invalidTitle" | "okTitle" => {
  if (result === NEWSLETTER_TOKEN_RESULT.OK) {
    return "okTitle"
  }

  return result === NEWSLETTER_TOKEN_RESULT.ALREADY_DONE ? "alreadyTitle" : "invalidTitle"
}

export const newsletterDescriptionKey = (
  result: Newsletter["tokenResult"]["result"],
): "alreadyDescription" | "invalidDescription" | "okDescription" => {
  if (result === NEWSLETTER_TOKEN_RESULT.OK) {
    return "okDescription"
  }

  return result === NEWSLETTER_TOKEN_RESULT.ALREADY_DONE ? "alreadyDescription" : "invalidDescription"
}
