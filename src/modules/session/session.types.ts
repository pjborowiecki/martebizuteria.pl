interface CustomerAccountSession {
  readonly browser: string
  readonly createdAt: Date
  readonly device: string
  readonly deviceType: "desktop" | "mobile" | "tablet" | "unknown"
  readonly id: string
  readonly ipAddress?: string | undefined
  readonly isCurrent: boolean
  readonly lastActiveAt: Date
}

export interface Session {
  customerSession: CustomerAccountSession
}
