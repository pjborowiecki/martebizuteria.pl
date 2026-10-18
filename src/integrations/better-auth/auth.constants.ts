import { type AuthRefusal } from "~/src/integrations/better-auth/auth.errors"

import { USER_ERROR_CODES } from "~/src/modules/user/user.constants"

import { ROUTES } from "~/src/routes"

const MAX_FORGET_PASSWORD_ATTEMPTS = 3

const MAX_LOGIN_ATTEMPTS = 5

const MAX_RESET_PASSWORD_ATTEMPTS = 5

const MAX_SIGNUP_ATTEMPTS = 3

export const MAX_CONCURRENT_SESSIONS = 5

export const RATE_LIMIT_MAX_REQUESTS = 100

export const RATE_LIMIT_WINDOW_IN_SECONDS = 60

export const SESSION_FRESH_AGE_IN_SECONDS = 86_400

export const SESSION_UPDATE_AGE_IN_SECONDS = 300

export const EMAIL_CHANGE_RECENT_SIGN_IN_MINUTES = 10

export const RATE_LIMIT_CUSTOM_RULES = {
  [ROUTES.API_AUTH.CHANGE_EMAIL]: {
    max: MAX_LOGIN_ATTEMPTS,
    window: RATE_LIMIT_WINDOW_IN_SECONDS,
  },
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

export const ADMIN_ACCOUNT_NOT_DELETABLE = {
  code: USER_ERROR_CODES.CANNOT_DELETE_ADMIN,
  message: "An admin account cannot be deleted until its admin access is removed in Settings, Team",
} as const

export const SESSION_NOT_FRESH = {
  code: "SESSION_NOT_FRESH",
  message: "Sign in again before making this change",
} as const satisfies AuthRefusal

export const ADMIN_TWO_FACTOR_REQUIRED = {
  code: "ADMIN_TWO_FACTOR_REQUIRED",
  message: "Turn on two-factor authentication before using the admin panel",
} as const satisfies AuthRefusal

export const ROLE_MANAGED_IN_TEAM_SETTINGS = {
  code: "ROLE_MANAGED_IN_TEAM_SETTINGS",
  message: "Admin access is granted and revoked in Settings, Team",
} as const

export const EMAIL_CHANGED_BY_ITS_OWNER = {
  code: "EMAIL_CHANGED_BY_ITS_OWNER",
  message: "An account's email address is changed by its owner, from the account page, with a confirmation from both addresses",
} as const

export const EMAIL_LINK_SUPERSEDED = {
  code: "INVALID_TOKEN",
  message: "This link was sent before the account's email address last changed",
} as const satisfies AuthRefusal

export const EMAIL_ADDRESS_TAKEN = {
  code: "USER_ALREADY_EXISTS",
  message: "Another account already uses this email address",
} as const satisfies AuthRefusal

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
  SET_USER_PASSWORD: "/admin/set-user-password",
  UNBAN_USER: "/admin/unban-user",
  UPDATE_USER: "/admin/update-user",
} as const

export const ADMIN_ACCOUNT_AUDIT_PATHS: ReadonlySet<string> = new Set(Object.values(ADMIN_PATHS))

export const SET_ROLE_PATH = "/admin/set-role"

export const REMOVE_USER_PATH = "/admin/remove-user"

export const ROLE_FIELD_ADMIN_PATHS: ReadonlySet<string> = new Set(["/admin/create-user", ADMIN_PATHS.UPDATE_USER])

export const VERIFY_TOTP_PATH = "/two-factor/verify-totp"

export const VERIFY_EMAIL_PATH = "/verify-email"

export const AUTH_BASE_PATH = "/api/auth"

export const CHANGE_EMAIL_VERIFICATION_REQUEST = "change-email-verification"
