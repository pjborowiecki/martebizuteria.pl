import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { ROLES } from "~/src/constants/_constants/permissions";

import { auth } from "~/src/integrations/better-auth/auth._server";
import { authActions } from "~/src/integrations/better-auth/auth.actions";
import { AUTH_ERROR_CODES, assertAdmin } from "~/src/integrations/better-auth/auth.assertions";
import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.background";

import { getCurrentLocale } from "~/src/lib/_utils/locale";

import { userAccessors } from "~/src/modules/user/user.accessors";
import { updateAdminCustomer } from "~/src/modules/user/user.admin-customer-update.server";
import { USER_ERROR_CODES } from "~/src/modules/user/user.constants";
import { userZodSchemas } from "~/src/modules/user/user.zod";

const deleteCustomerFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => userZodSchemas.deleteCustomerInput.parse(data))
  .handler(async ({ data: { userId } }) => {
    await assertAdmin();

    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (session?.user === undefined) {
      throw new Error(AUTH_ERROR_CODES.UNAUTHORIZED);
    }

    const targetUser = await userAccessors.getUserById(userId);
    if (targetUser === undefined) {
      throw new Error(USER_ERROR_CODES.NOT_FOUND);
    }

    if (targetUser.id === session.user.id) {
      throw new Error(USER_ERROR_CODES.CANNOT_DELETE_SELF);
    }

    if (targetUser.role === ROLES.ADMIN) {
      throw new Error(USER_ERROR_CODES.CANNOT_DELETE_ADMIN);
    }

    const goodbyeEmail = {
      email: targetUser.email,
      locale: getCurrentLocale(),
      name: targetUser.name
    };

    await auth.api.removeUser({
      body: { userId },
      headers
    });

    scheduleBackgroundWork(authActions.sendAccountDeletedEmail(goodbyeEmail));

    return { ok: true as const, userId };
  });

const updateAdminCustomerFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => userZodSchemas.updateAdminCustomerInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();
    return updateAdminCustomer(data);
  });

export const userMutations = {
  deleteCustomerFn,
  updateAdminCustomerFn
};
