export const SESSION_TABLE_COLUMN_ID = {
  actions: "actions",
  browser: "browser",
  device: "device",
  ipAddress: "ipAddress",
  lastActive: "lastActive",
  signedIn: "signedIn",
} as const

export const SESSION_TABLE_COLUMN_SIZE = {
  actions: 48,
  browser: 180,
  device: 260,
  ipAddress: 180,
  lastActive: 180,
  signedIn: 200,
} as const

export const SESSION_QUERY_KEYS = {
  CURRENT: ["session", "current"] as const,
  CUSTOMER: {
    SESSIONS: ["customer-account", "sessions"] as const,
  },
}

export const SESSION_MUTATION_KEYS = {
  REVOKE_OTHER_SESSIONS: ["customer-account", "revokeOtherCustomerSessions"] as const,
  REVOKE_SESSION: ["customer-account", "revokeCustomerSession"] as const,
} as const
