import { type AuthRefusal } from "~/src/integrations/better-auth/auth.errors"
import { TURNSTILE_ACTIONS, type TurnstileAction } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"

import { USER_ERROR_CODES } from "~/src/modules/user/user.constants"

import { ROUTES } from "~/src/routes"

const MAX_FORGET_PASSWORD_ATTEMPTS = 3

const MAX_LOGIN_ATTEMPTS = 5

const MAX_RESET_PASSWORD_ATTEMPTS = 5

const MAX_SIGNUP_ATTEMPTS = 3

export const MAX_CONCURRENT_SESSIONS = 5

export const RATE_LIMIT_MAX_REQUESTS = 100

export const RATE_LIMIT_WINDOW_IN_SECONDS = 60

export const SESSION_UPDATE_AGE_IN_SECONDS = 300

export const RATE_LIMIT_CUSTOM_RULES = {
  [ROUTES.API_AUTH.REQUEST_PASSWORD_RESET]: {
    max: MAX_FORGET_PASSWORD_ATTEMPTS,
    window: RATE_LIMIT_WINDOW_IN_SECONDS,
  },
  [ROUTES.API_AUTH.RESET_PASSWORD]: {
    max: MAX_RESET_PASSWORD_ATTEMPTS,
    window: RATE_LIMIT_WINDOW_IN_SECONDS,
  },
  [ROUTES.API_AUTH.SIGN_IN_EMAIL]: {
    max: MAX_LOGIN_ATTEMPTS,
    window: RATE_LIMIT_WINDOW_IN_SECONDS,
  },
  [ROUTES.API_AUTH.SIGN_UP_EMAIL]: {
    max: MAX_SIGNUP_ATTEMPTS,
    window: RATE_LIMIT_WINDOW_IN_SECONDS,
  },
}

export const EMAIL_SENDING_AUTH_PATHS: ReadonlySet<string> = new Set([
  ROUTES.API_AUTH.CHANGE_EMAIL,
  ROUTES.API_AUTH.REQUEST_PASSWORD_RESET,
  ROUTES.API_AUTH.SEND_VERIFICATION_EMAIL,
  ROUTES.API_AUTH.SIGN_UP_EMAIL,
])

export const BOT_CHECKED_AUTH_PATHS: ReadonlyMap<string, TurnstileAction> = new Map([
  [ROUTES.API_AUTH.REQUEST_PASSWORD_RESET, TURNSTILE_ACTIONS.PASSWORD_RESET],
  [ROUTES.API_AUTH.SEND_VERIFICATION_EMAIL, TURNSTILE_ACTIONS.VERIFICATION_RESEND],
  [ROUTES.API_AUTH.SIGN_UP_EMAIL, TURNSTILE_ACTIONS.SIGN_UP],
])

export const BOT_CHECK_FAILED = {
  code: "BOT_CHECK_FAILED",
  message: "The bot check did not pass",
} as const satisfies AuthRefusal

export const EMAIL_DELIVERY_FAILED = {
  code: "EMAIL_DELIVERY_FAILED",
  message: "The email could not be sent",
} as const satisfies AuthRefusal

export const EMAIL_DELIVERY_UNAVAILABLE = {
  code: "EMAIL_DELIVERY_UNAVAILABLE",
  message: "Emails cannot be sent at the moment",
} as const satisfies AuthRefusal

export const STRIPE_CUSTOMER_NOT_DELETED = {
  code: USER_ERROR_CODES.STRIPE_CUSTOMER_NOT_DELETED,
  message: "The saved cards could not be deleted at Stripe, so the account was kept",
} as const

export const ADMIN_PASSWORD_SIGN_IN_REQUIRED = {
  code: "ADMIN_PASSWORD_SIGN_IN_REQUIRED",
  message: "Admin accounts sign in with their password and a two-factor authentication code",
} as const satisfies AuthRefusal

export const ADMIN_TWO_FACTOR_REQUIRED = {
  code: "ADMIN_TWO_FACTOR_REQUIRED",
  message: "Turn on two-factor authentication before using the admin panel",
} as const satisfies AuthRefusal

export const PROVIDER_SIGN_IN_PATH_PREFIXES = ["/callback/", "/sign-in/social"]

export const ADMIN_PLUGIN_PATH_PREFIX = "/admin/"

export const TWO_FACTOR_VERIFY_PATH_PREFIX = "/two-factor/verify-"

export const SIGN_IN_PATH_PREFIXES = ["/sign-in/", "/sign-up/", "/callback/", "/verify-email", TWO_FACTOR_VERIFY_PATH_PREFIX]

export const CHANGE_PASSWORD_PATH = "/change-password"

export const DISABLE_TWO_FACTOR_PATH = "/two-factor/disable"

export const OWN_ACCOUNT_AUDIT_PATHS: ReadonlySet<string> = new Set([
  CHANGE_PASSWORD_PATH,
  DISABLE_TWO_FACTOR_PATH,
  "/revoke-other-sessions",
  "/revoke-session",
  "/revoke-sessions",
])

export const ADMIN_PATHS = {
  BAN_USER: "/admin/ban-user",
  REVOKE_USER_SESSIONS: "/admin/revoke-user-sessions",
  SET_ROLE: "/admin/set-role",
  SET_USER_PASSWORD: "/admin/set-user-password",
  UNBAN_USER: "/admin/unban-user",
  UPDATE_USER: "/admin/update-user",
} as const

export const ADMIN_ACCOUNT_AUDIT_PATHS: ReadonlySet<string> = new Set(Object.values(ADMIN_PATHS))

export const VERIFY_TOTP_PATH = "/two-factor/verify-totp"

export const VERIFY_EMAIL_PATH = "/verify-email"
