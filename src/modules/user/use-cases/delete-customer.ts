import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"
import type * as zod from "zod"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth, sendAccountDeletedEmail } from "~/src/integrations/better-auth/auth.server"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getUserById } from "~/src/modules/user/user.accessors"
import { USER_ERROR_CODES, USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const deleteCustomer = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["delete"] })])
  .validator((input: zod.input<typeof userZodSchemas.deleteCustomerInput>) => userZodSchemas.deleteCustomerInput.parse(input))
  .handler(async ({ context, data: { userId } }) => {
    const targetUser = await getUserById(userId)
    if (targetUser === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND, USER_ERROR_CODES.NOT_FOUND)
    }

    if (targetUser.id === context.auth.user.id) {
      throw new AppError(ERROR_CODES.CONFLICT, USER_ERROR_CODES.CANNOT_DELETE_SELF)
    }

    if (targetUser.role === ROLES.ADMIN) {
      throw new AppError(ERROR_CODES.FORBIDDEN, USER_ERROR_CODES.CANNOT_DELETE_ADMIN)
    }

    const goodbyeEmail = {
      email: targetUser.email,
      locale: getCurrentLocale(),
      name: targetUser.name,
    }

    await auth.api.removeUser({
      body: { userId },
      headers: getRequestHeaders(),
    })

    const goodbyeEmailSent = await sendAccountDeletedEmail(goodbyeEmail)

    return { goodbyeEmailSent, ok: true as const, userId }
  })

export const deleteCustomerMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof deleteCustomer>[0]["data"]) => deleteCustomer({ data }),
  mutationKey: USER_MUTATION_KEYS.DELETE_CUSTOMER,
})
