import { type GenericEndpointContext } from "better-auth"
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api"
import { and, eq, ne } from "drizzle-orm"

import { EMAIL_CHANGE_RECENT_SIGN_IN_MINUTES, SESSION_NOT_FRESH, VERIFY_EMAIL_PATH } from "~/src/integrations/better-auth/auth.constants"
import { readLinkPayload } from "~/src/integrations/better-auth/auth.email-link.server"
import { confirmedEmailChangeSchema } from "~/src/integrations/better-auth/auth.zod"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { updateStripeCustomerEmail } from "~/src/integrations/stripe/stripe.customer.server"

import {
  recordAuthEmailChangedAudit,
  recordCustomerStripeEmailFailedAudit,
  resolveAuthAuditActor,
} from "~/src/modules/audit-log/audit-log.events.server"
import { followAccountAddressChange } from "~/src/modules/newsletter/newsletter.address-change.server"
import { session } from "~/src/modules/session/session.schema"
import { sendEmailChangedEmail } from "~/src/modules/user/use-cases/send-email-changed-email.server"
import { deleteVerificationsOfUser } from "~/src/modules/verification/verification.accessors"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { auditRequestIp } from "~/src/lib/request"

const MS_PER_MINUTE = 60_000

const signedInRecently = ({ createdAt }: Readonly<{ createdAt: Date }>): boolean =>
  Date.now() - createdAt.getTime() < EMAIL_CHANGE_RECENT_SIGN_IN_MINUTES * MS_PER_MINUTE

export const confirmEmailChangeOwner = async (ctx: GenericEndpointContext): Promise<void> => {
  const requester = await getSessionFromCtx(ctx)
  if (requester === null) {
    return
  }

  const credential = await ctx.context.internalAdapter.findCredentialAccount(requester.user.id)
  if (typeof credential?.password === "string") {
    await ctx.context.password.checkPassword(requester.user.id, ctx)
  } else if (!signedInRecently(requester.session)) {
    throw APIError.from("FORBIDDEN", SESSION_NOT_FRESH)
  }
}

const attempt = async (step: string, task: Promise<void>): Promise<void> => {
  try {
    await task
  } catch (error) {
    console.error(`[Email change] ${step} failed:`, error)
  }
}

const endOtherSessions = async ({ account, keptSessionId }: Readonly<CompletedEmailChange>): Promise<void> => {
  await db.delete(session).where(and(eq(session.userId, account.id), ne(session.id, keptSessionId)))
}

const syncStripeCustomerEmail = async ({ account, ip }: Readonly<CompletedEmailChange>): Promise<void> => {
  try {
    await updateStripeCustomerEmail({ email: account.email, userId: account.id })
  } catch (error) {
    console.error(`[Email change] Stripe kept the old email of user ${account.id}; the next checkout sets it again:`, error)
    recordCustomerStripeEmailFailedAudit(resolveAuthAuditActor(account), { detail: String(error), ip })
  }
}

const followEmailChange = async (change: Readonly<CompletedEmailChange>): Promise<void> => {
  const { account, previousEmail } = change
  await Promise.all([
    attempt(
      "Moving the newsletter subscription",
      followAccountAddressChange({ from: previousEmail, to: account.email, userId: account.id }),
    ),
    attempt("Ending the links sent to the old address", deleteVerificationsOfUser(account.id)),
    attempt("Signing out the other devices", endOtherSessions(change)),
    syncStripeCustomerEmail(change),
  ])
  scheduleBackgroundWork(sendEmailChangedEmail({ email: account.email, name: account.name, previousEmail, userId: account.id }))
}

export const finishEmailChange = createAuthMiddleware(async (ctx) => {
  const changed = ctx.context.newSession
  const link = ctx.path === VERIFY_EMAIL_PATH ? confirmedEmailChangeSchema.safeParse(await readLinkPayload(ctx)).data : undefined
  if (link === undefined || changed === null || changed.user.email !== link.updateTo) {
    return
  }

  const ip = auditRequestIp(ctx.headers)
  recordAuthEmailChangedAudit(resolveAuthAuditActor(changed.user), {
    detail: `${link.email} → ${link.updateTo}`,
    ip,
    metadata: { changed: ["email"], new: { email: link.updateTo }, old: { email: link.email } },
  })
  await followEmailChange({ account: changed.user, ip, keptSessionId: changed.session.id, previousEmail: link.email })
})

interface CompletedEmailChange {
  readonly account: { readonly email: string; readonly id: string; readonly name: string; readonly role?: string | null | undefined }
  readonly ip: string | undefined
  readonly keptSessionId: string
  readonly previousEmail: string
}
