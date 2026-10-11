import { env } from "cloudflare:workers"

import { recordEmailFailedAudit } from "~/src/modules/audit-log/audit-log.events.server"

import { withinRateLimit } from "~/src/lib/rate-limit"

export const PUBLIC_EMAIL_KINDS = {
  NEWSLETTER: "newsletter",
  PASSWORD_RESET: "password-reset",
  VERIFICATION: "verification",
  WITHDRAWAL: "withdrawal",
} as const

export const PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX = 3

export const PUBLIC_EMAILS_DAILY_MAX = 50

const SECONDS_PER_HOUR = 3600

const SECONDS_PER_DAY = 86_400

const recipientDigest = async (to: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(to.trim().toLowerCase()))

  return btoa(String.fromCodePoint(...new Uint8Array(digest)))
}

const withinRecipientLimit = async ({ kind, to }: PublicEmail): Promise<boolean> =>
  withinRateLimit({
    key: `public-email:${env.APP_ENV}:${kind}:${await recipientDigest(to)}`,
    limit: PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX,
    windowSeconds: SECONDS_PER_HOUR,
  })

const withinDailyLimit = (): Promise<boolean> =>
  withinRateLimit({ key: `public-email:${env.APP_ENV}:daily`, limit: PUBLIC_EMAILS_DAILY_MAX, windowSeconds: SECONDS_PER_DAY })

export const admitPublicEmail = async (email: PublicEmail): Promise<boolean> => {
  if (!(await withinRecipientLimit(email))) {
    console.warn(`[Email] Skipped a ${email.kind} email to ${email.to}: the address reached its hourly limit for this email`)

    return false
  }

  if (!(await withinDailyLimit())) {
    const reason = `the shop reached its daily limit of ${String(PUBLIC_EMAILS_DAILY_MAX)} emails that visitors can request`
    console.error(`[Email] Skipped a ${email.kind} email to ${email.to}: ${reason}`)
    recordEmailFailedAudit(email.to, { detail: `Public ${email.kind} email — ${reason}` })

    return false
  }

  return true
}

interface PublicEmail {
  readonly kind: (typeof PUBLIC_EMAIL_KINDS)[keyof typeof PUBLIC_EMAIL_KINDS]
  readonly to: string
}
