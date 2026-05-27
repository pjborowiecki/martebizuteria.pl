export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  SUPPORT: "support",
  USER: "user"
} as const;

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
