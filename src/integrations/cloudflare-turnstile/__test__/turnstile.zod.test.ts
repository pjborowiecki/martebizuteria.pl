import { describe, expect, it } from "vite-plus/test"

import { TURNSTILE_TESTING_KEYS, TURNSTILE_TOKEN_MAX_LENGTH } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"
import { turnstileTokenSchema } from "~/src/integrations/cloudflare-turnstile/turnstile.zod"

describe("turnstileTokenSchema", () => {
  it.each([
    ["Cloudflare's testing token", TURNSTILE_TESTING_KEYS.DUMMY_TOKEN],
    ["a token as long as Turnstile issues", "t".repeat(TURNSTILE_TOKEN_MAX_LENGTH)],
  ])("accepts %s", (_label, token) => {
    expect(turnstileTokenSchema.parse(token)).toBe(token)
  })

  it.each([
    ["an empty token", ""],
    ["a token longer than Turnstile issues", "t".repeat(TURNSTILE_TOKEN_MAX_LENGTH + 1)],
    ["a missing token", null],
  ])("refuses %s", (_label, token) => {
    expect(turnstileTokenSchema.safeParse(token).success).toBe(false)
  })
})
