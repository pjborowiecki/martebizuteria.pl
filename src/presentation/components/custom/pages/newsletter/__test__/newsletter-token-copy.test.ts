import { describe, expect, it } from "vite-plus/test"

import { NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"

import { newsletterDescriptionKey, newsletterTitleKey } from "~/src/presentation/components/custom/pages/newsletter/newsletter-token-copy"

import englishCopy from "~/messages/en-US/pages.newsletter.json"

describe("newsletterTitleKey", () => {
  it.each([
    [NEWSLETTER_TOKEN_RESULT.OK, "okTitle"],
    [NEWSLETTER_TOKEN_RESULT.ALREADY_DONE, "alreadyTitle"],
    [NEWSLETTER_TOKEN_RESULT.INVALID, "invalidTitle"],
  ] as const)("heads the %s outcome with %s", (result, key) => {
    expect(newsletterTitleKey(result)).toBe(key)
  })

  it("only names titles both newsletter pages translate", () => {
    const keys = Object.values(NEWSLETTER_TOKEN_RESULT).map((result) => newsletterTitleKey(result))

    expect(keys.every((key) => key in englishCopy.confirm && key in englishCopy.unsubscribe)).toBe(true)
  })
})

describe("newsletterDescriptionKey", () => {
  it.each([
    [NEWSLETTER_TOKEN_RESULT.OK, "okDescription"],
    [NEWSLETTER_TOKEN_RESULT.ALREADY_DONE, "alreadyDescription"],
    [NEWSLETTER_TOKEN_RESULT.INVALID, "invalidDescription"],
  ] as const)("explains the %s outcome with %s", (result, key) => {
    expect(newsletterDescriptionKey(result)).toBe(key)
  })

  it("only names descriptions both newsletter pages translate", () => {
    const keys = Object.values(NEWSLETTER_TOKEN_RESULT).map((result) => newsletterDescriptionKey(result))

    expect(keys.every((key) => key in englishCopy.confirm && key in englishCopy.unsubscribe)).toBe(true)
  })
})
