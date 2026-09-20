import { createServerFn } from "@tanstack/react-start"
import { getRequestHeaders } from "@tanstack/react-start/server"

import { authActions } from "~/src/integrations/better-auth/auth.actions"
import { AUTH_ERROR_CODES, assertAdmin } from "~/src/integrations/better-auth/auth.assertions"
import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.background"
import { ROLES } from "~/src/integrations/better-auth/auth.constants"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getUserById } from "~/src/modules/user/user.accessors"
import { USER_ERROR_CODES } from "~/src/modules/user/user.constants"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const deleteCustomerFn = createServerFn({ method: "POST" })
  .validator((data: unknown) => userZodSchemas.deleteCustomerInput.parse(data))
  .handler(async ({ data: { userId } }) => {
    await assertAdmin()

    const headers = getRequestHeaders()
    const session = await getRequestSession()
    if (session?.user === undefined) {
      throw new Error(AUTH_ERROR_CODES.UNAUTHORIZED)
    }

    const targetUser = await getUserById(userId)
    if (targetUser === undefined) {
      throw new Error(USER_ERROR_CODES.NOT_FOUND)
    }

    if (targetUser.id === session.user.id) {
      throw new Error(USER_ERROR_CODES.CANNOT_DELETE_SELF)
    }

    if (targetUser.role === ROLES.ADMIN) {
      throw new Error(USER_ERROR_CODES.CANNOT_DELETE_ADMIN)
    }

    const goodbyeEmail = {
      email: targetUser.email,
      locale: getCurrentLocale(),
      name: targetUser.name,
    }

    await auth.api.removeUser({
      body: { userId },
      headers,
    })

    scheduleBackgroundWork(authActions.sendAccountDeletedEmail(goodbyeEmail))

    return { ok: true as const, userId }
  })
