import { env } from "cloudflare:workers"

import { AUDIT_EMAIL_KIND, type AuditEmailKind } from "~/src/modules/audit-log/audit-log.constants"
import { recordEmailFailedAudit } from "~/src/modules/audit-log/use-cases/record-email-audit.server"
import { PUBLIC_EMAIL_RATE_LIMIT_KEY, RATE_LIMIT_WINDOW_SECONDS } from "~/src/modules/rate-limit/rate-limit.constants"

import { withinRateLimit } from "~/src/lib/rate-limit"

export const PUBLIC_EMAIL_KINDS = {
  NEWSLETTER: "newsletter",
  PASSWORD_RESET: "password-reset",
  VERIFICATION: "verification",
  WITHDRAWAL: "withdrawal",
} as const

const PUBLIC_EMAIL_AUDIT_KINDS: Readonly<Record<PublicEmail["kind"], AuditEmailKind>> = {
  [PUBLIC_EMAIL_KINDS.NEWSLETTER]: AUDIT_EMAIL_KIND.NEWSLETTER_SUBSCRIPTION,
  [PUBLIC_EMAIL_KINDS.PASSWORD_RESET]: AUDIT_EMAIL_KIND.RESET_PASSWORD,
  [PUBLIC_EMAIL_KINDS.VERIFICATION]: AUDIT_EMAIL_KIND.VERIFICATION,
  [PUBLIC_EMAIL_KINDS.WITHDRAWAL]: AUDIT_EMAIL_KIND.ORDER_WITHDRAWAL,
}

export const PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX = 3

export const PUBLIC_EMAILS_DAILY_MAX = 50

const recipientDigest = async (to: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(to.trim().toLowerCase()))

  return btoa(String.fromCodePoint(...new Uint8Array(digest)))
}

const withinRecipientLimit = async ({ kind, to }: PublicEmail): Promise<boolean> =>
  withinRateLimit({
    key: `${PUBLIC_EMAIL_RATE_LIMIT_KEY.PREFIX}${env.APP_ENV}:${kind}:${await recipientDigest(to)}`,
    limit: PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS.PUBLIC_EMAIL_RECIPIENT,
  })

const withinDailyLimit = (): Promise<boolean> =>
  withinRateLimit({
    key: `${PUBLIC_EMAIL_RATE_LIMIT_KEY.PREFIX}${env.APP_ENV}${PUBLIC_EMAIL_RATE_LIMIT_KEY.DAILY_SUFFIX}`,
    limit: PUBLIC_EMAILS_DAILY_MAX,
    windowSeconds: RATE_LIMIT_WINDOW_SECONDS.PUBLIC_EMAIL_DAILY,
  })

export const admitPublicEmail = async (email: PublicEmail): Promise<boolean> => {
  if (!(await withinRecipientLimit(email))) {
    console.warn(`[Email] Skipped a ${email.kind} email to ${email.to}: the address reached its hourly limit for this email`)

    return false
  }

  if (!(await withinDailyLimit())) {
    const reason = `the shop reached its daily limit of ${String(PUBLIC_EMAILS_DAILY_MAX)} emails that visitors can request`
    console.error(`[Email] Skipped a ${email.kind} email to ${email.to}: ${reason}`)
    recordEmailFailedAudit(email.to, {
      metadata: { dailyLimit: PUBLIC_EMAILS_DAILY_MAX, emailKind: PUBLIC_EMAIL_AUDIT_KINDS[email.kind] },
      resourceId: email.userId,
    })

    return false
  }

  return true
}

interface PublicEmail {
  readonly kind: (typeof PUBLIC_EMAIL_KINDS)[keyof typeof PUBLIC_EMAIL_KINDS]
  readonly to: string
  readonly userId?: string | undefined
}
