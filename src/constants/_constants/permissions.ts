export const ROLES = {
  ADMIN: "admin",
  CUSTOMER: "customer"
} as const;

export const DEFAULT_ROLE = ROLES.CUSTOMER;

export const ADMIN_PANEL_ROLES = [ROLES.ADMIN] as const;

export const RESOURCES = {
  ORDER: "order",
  PRODUCT: "product",
  SETTINGS: "settings",
  USER: "user"
} as const;

export const ACTIONS = {
  CREATE: "create",
  DELETE: "delete",
  MANAGE: "manage",
  PUBLISH: "publish",
  READ: "read",
  REFUND: "refund",
  UPDATE: "update"
} as const;
