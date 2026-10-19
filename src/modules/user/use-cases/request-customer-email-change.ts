import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { type BetterAuthOptions } from "better-auth"
import { createEmailVerificationToken } from "better-auth/api"
import type * as zod from "zod"

import { hasAdminAccess } from "~/src/integrations/better-auth/auth.access"
import { AUTH_BASE_PATH, CHANGE_EMAIL_VERIFICATION_REQUEST, VERIFY_EMAIL_PATH } from "~/src/integrations/better-auth/auth.constants"
import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { AUDIT_LOG_ACTION, CUSTOMER_EMAIL_CHANGE_REFUSAL } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditEventOptions } from "~/src/modules/audit-log/audit-log.types"
import { resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.utils"
import { recordCustomerEmailChangeAudit } from "~/src/modules/audit-log/use-cases/record-customer-audit.server"
import { getOrdersPlacedWhileSignedIn } from "~/src/modules/order/order.accessors"
import { resolveOrderLocale } from "~/src/modules/order/order.utils"
import { getCurrentAddressHolder } from "~/src/modules/user-email-history/user-email-history.accessors"
import { sendSupportEmailChangeEmail } from "~/src/modules/user/use-cases/send-support-email-change-email.server"
import { getUserById } from "~/src/modules/user/user.accessors"
import { CUSTOMER_EMAIL_CHANGE_ATTEMPTS, CUSTOMER_EMAIL_CHANGE_ERROR, USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { withinRateLimit } from "~/src/lib/rate-limit"
import { resolveRequestIp, resolveRequestOrigin } from "~/src/lib/request"
import { buildLocalizedUrl } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

type EmailChangeRequest = zod.output<typeof userZodSchemas.customerEmailChangeInput>

const comparable = (value: string): string => value.replaceAll(/[^\p{L}\p{N}]/gu, "").toUpperCase()

const customerMovingTo = async (newEmail: string, userId: string): Promise<User["select"]> => {
  const customer = await getUserById(userId)
  if (customer === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND, CUSTOMER_EMAIL_CHANGE_ERROR.NOT_FOUND)
  }

  if (hasAdminAccess(customer.role)) {
    throw new AppError(ERROR_CODES.FORBIDDEN, CUSTOMER_EMAIL_CHANGE_ERROR.ADMIN_ACCOUNT)
  }

  if (customer.email.toLowerCase() === newEmail) {
    throw new AppError(ERROR_CODES.CONFLICT, CUSTOMER_EMAIL_CHANGE_ERROR.UNCHANGED)
  }

  if ((await getCurrentAddressHolder(newEmail)) !== undefined) {
    throw new AppError(ERROR_CODES.CONFLICT, CUSTOMER_EMAIL_CHANGE_ERROR.ADDRESS_TAKEN)
  }

  return customer
}

const orderNamedByCustomer = async (customerId: string, { orderNumber, postalCode }: EmailChangeRequest) => {
  const orders = await getOrdersPlacedWhileSignedIn(customerId)

  return orders.find(
    (placed) =>
      comparable(placed.orderNumber) === comparable(orderNumber) &&
      placed.postalCode !== null &&
      comparable(placed.postalCode) === comparable(postalCode),
  )
}

const verificationLink = async ({ from, locale, to }: Readonly<{ from: string; locale: SupportedLocale; to: string }>): Promise<string> => {
  const { options, secret } = await auth.$context
  const { emailVerification }: BetterAuthOptions = options
  const token = await createEmailVerificationToken(secret, from, to, emailVerification.expiresIn, {
    requestType: CHANGE_EMAIL_VERIFICATION_REQUEST,
  })
  const link = new URL(`${AUTH_BASE_PATH}${VERIFY_EMAIL_PATH}`, resolveRequestOrigin(getRequest()))
  link.search = new URLSearchParams({ callbackURL: buildLocalizedUrl("", ROUTES.ACCOUNT_PROFILE, locale), token }).toString()

  return link.toString()
}

const recordRefusal = (
  account: User["select"],
  audit: AuditEventOptions,
  refusal: (typeof CUSTOMER_EMAIL_CHANGE_REFUSAL)[keyof typeof CUSTOMER_EMAIL_CHANGE_REFUSAL],
): void => {
  recordCustomerEmailChangeAudit(AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_VERIFICATION_FAILED, resolveAuthAuditActor(account), {
    ...audit,
    metadata: { ...audit.metadata, refusal },
  })
}

export const requestCustomerEmailChange = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["update"] })])
  .validator((input: zod.input<typeof userZodSchemas.customerEmailChangeInput>) => userZodSchemas.customerEmailChangeInput.parse(input))
  .handler(async ({ context, data }) => {
    const newEmail = data.newEmail.toLowerCase()
    const customer = await customerMovingTo(newEmail, data.userId)
    const audit = {
      actor: resolveAuthAuditActor(context.auth.user),
      ip: resolveRequestIp(context.requestHeaders),
      metadata: { newEmail, orderNumber: data.orderNumber },
    }
    const admitted = await withinRateLimit({
      key: `${CUSTOMER_EMAIL_CHANGE_ATTEMPTS.KEY_PREFIX}${customer.id}`,
      limit: CUSTOMER_EMAIL_CHANGE_ATTEMPTS.MAX,
      windowSeconds: CUSTOMER_EMAIL_CHANGE_ATTEMPTS.WINDOW_SECONDS,
    })
    if (!admitted) {
      recordRefusal(customer, audit, CUSTOMER_EMAIL_CHANGE_REFUSAL.TOO_MANY_ATTEMPTS)
      throw new AppError(ERROR_CODES.TOO_MANY_REQUESTS, CUSTOMER_EMAIL_CHANGE_ERROR.TOO_MANY_ATTEMPTS)
    }

    const proof = await orderNamedByCustomer(customer.id, data)
    if (proof === undefined) {
      recordRefusal(customer, audit, CUSTOMER_EMAIL_CHANGE_REFUSAL.MISMATCH)
      throw new AppError(ERROR_CODES.FORBIDDEN, CUSTOMER_EMAIL_CHANGE_ERROR.NOT_VERIFIED)
    }

    const locale = resolveOrderLocale(proof.metadata)
    const url = await verificationLink({ from: customer.email, locale, to: newEmail })
    if (!(await sendSupportEmailChangeEmail({ email: newEmail, locale, name: customer.name, url, userId: customer.id }))) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, CUSTOMER_EMAIL_CHANGE_ERROR.EMAIL_NOT_SENT)
    }

    recordCustomerEmailChangeAudit(AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_REQUESTED, resolveAuthAuditActor(customer), audit)

    return { newEmail }
  })

export const requestCustomerEmailChangeMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof requestCustomerEmailChange>[0]["data"]) => requestCustomerEmailChange({ data }),
  mutationKey: USER_MUTATION_KEYS.REQUEST_CUSTOMER_EMAIL_CHANGE,
})
