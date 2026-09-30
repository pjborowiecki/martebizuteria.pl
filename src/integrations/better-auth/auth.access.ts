import { type RoleAuthorizeRequest, createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

export const ROLES = {
  ADMIN: "admin",
  CUSTOMER: "customer",
} as const

export const DEFAULT_ROLE = ROLES.CUSTOMER

export const ADMIN_PANEL_ROLES = [ROLES.ADMIN] as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const RESOURCES = {
  ORDER: "order",
  PRODUCT: "product",
  SETTINGS: "settings",
  USER: "user",
} as const

export const ACTIONS = {
  CREATE: "create",
  DELETE: "delete",
  MANAGE: "manage",
  PUBLISH: "publish",
  READ: "read",
  REFUND: "refund",
  UPDATE: "update",
} as const

export const PERMISSIONS_STATEMENTS = {
  ...defaultStatements,
  [RESOURCES.ORDER]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.REFUND],
  [RESOURCES.PRODUCT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.PUBLISH],
  [RESOURCES.SETTINGS]: [ACTIONS.MANAGE],
} as const

export const ac = createAccessControl(PERMISSIONS_STATEMENTS)

export const ROLES_CONFIG = {
  [ROLES.ADMIN]: ac.newRole({
    [RESOURCES.ORDER]: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.REFUND],
    [RESOURCES.PRODUCT]: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.PUBLISH],
    [RESOURCES.SETTINGS]: [ACTIONS.MANAGE],
    ...adminAc.statements,
  }),
  [ROLES.CUSTOMER]: ac.newRole({
    [RESOURCES.ORDER]: [],
    [RESOURCES.PRODUCT]: [],
    [RESOURCES.SETTINGS]: [],
    session: [],
    user: [],
  }),
} as const

export type Permission = RoleAuthorizeRequest<typeof ac.statements>

export const hasAdminAccess = (role: string | null | undefined): role is Role =>
  typeof role === "string" && (ADMIN_PANEL_ROLES as readonly string[]).includes(role)

const isKnownRole = (role: string | null | undefined): role is keyof typeof ROLES_CONFIG =>
  typeof role === "string" && Object.hasOwn(ROLES_CONFIG, role)

export const hasPermission = ({ permission, role }: { permission: Permission; role: string | null | undefined }): boolean =>
  isKnownRole(role) && ROLES_CONFIG[role].authorize(permission).success
