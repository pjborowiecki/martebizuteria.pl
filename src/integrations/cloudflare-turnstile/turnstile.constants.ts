export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com"

export const TURNSTILE_SCRIPT_URL = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`

export const TURNSTILE_SITEVERIFY_URL = `${TURNSTILE_ORIGIN}/turnstile/v0/siteverify`

export const TURNSTILE_ACTIONS = {
  CHECKOUT: "checkout",
  NEWSLETTER: "newsletter",
  PASSWORD_RESET: "password-reset",
  SIGN_UP: "sign-up",
  VERIFICATION_RESEND: "verification-resend",
} as const

export type TurnstileAction = (typeof TURNSTILE_ACTIONS)[keyof typeof TURNSTILE_ACTIONS]

export const TURNSTILE_ERROR_CODES = {
  BOT_CHECK_FAILED: "BOT_CHECK_FAILED",
} as const

export const TURNSTILE_TOKEN_MAX_LENGTH = 2048

export const TURNSTILE_TOKEN_HEADER = "x-turnstile-token"

export const TURNSTILE_TESTING_KEYS = {
  ALWAYS_PASSES_SECRET_KEY: "1x0000000000000000000000000000000AA",
  ALWAYS_PASSES_SITE_KEY: "1x00000000000000000000AA",
  DUMMY_TOKEN: "XXXX.DUMMY.TOKEN.XXXX",
} as const
