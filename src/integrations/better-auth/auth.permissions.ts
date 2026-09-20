import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements } from "better-auth/plugins/admin/access"

import { ACTIONS, ADMIN_PANEL_ROLES, RESOURCES, ROLES } from "~/src/integrations/better-auth/auth.constants"
import { type Role } from "~/src/integrations/better-auth/auth.types"
export const hasAdminAccess = (role: string | null | undefined): role is Role =>
  typeof role === "string" && (ADMIN_PANEL_ROLES as readonly string[]).includes(role)

export const PERMISSIONS_STATEMENTS = {
  ...defaultStatements,
  [RESOURCES.ORDER]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.REFUND],
  [RESOURCES.PRODUCT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.PUBLISH],
  [RESOURCES.SETTINGS]: [ACTIONS.MANAGE],
} as const
export const ac = createAccessControl(PERMISSIONS_STATEMENTS)
const ALL_USER_PERMISSIONS = [
  "create",
  "list",
  "set-role",
  "ban",
  "impersonate",
  "impersonate-admins",
  "delete",
  "set-password",
  "get",
  "update",
] as const
const ALL_SESSION_PERMISSIONS = ["list", "revoke", "delete"] as const
export const ROLES_CONFIG = {
  [ROLES.ADMIN]: ac.newRole({
    [RESOURCES.ORDER]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.REFUND],
    [RESOURCES.PRODUCT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.PUBLISH],
    [RESOURCES.SETTINGS]: [ACTIONS.MANAGE],
    session: [...ALL_SESSION_PERMISSIONS],
    user: [...ALL_USER_PERMISSIONS],
  }),
  [ROLES.CUSTOMER]: ac.newRole({
    [RESOURCES.ORDER]: [],
    [RESOURCES.PRODUCT]: [],
    [RESOURCES.SETTINGS]: [],
    session: [],
    user: [],
  }),
} as const
