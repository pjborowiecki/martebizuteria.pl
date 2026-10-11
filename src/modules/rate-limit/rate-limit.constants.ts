export const RATE_LIMIT_WINDOW_SECONDS = {
  PUBLIC_EMAIL_DAILY: 86_400,
  PUBLIC_EMAIL_RECIPIENT: 3600,
  REQUEST: 60,
} as const

export const PUBLIC_EMAIL_RATE_LIMIT_KEY = {
  DAILY_SUFFIX: ":daily",
  PREFIX: "public-email:",
} as const
