export const TEST_PASSWORD = "MarteE2ePassword123!"

export const ADMIN_TOTP_SECRET = "MarteE2eAdminAuthenticatorSecret"

export const TEST_ACCOUNTS = {
  admin: { email: "admin@marte.example.test", id: "e2e-admin", name: "Ada Admin", role: "admin" },
  adminWithoutTwoFactor: { email: "new-admin@marte.example.test", id: "e2e-new-admin", name: "Nina Admin", role: "admin" },
  customer: { email: "customer@marte.example.test", id: "e2e-customer", name: "Celina Klientka", role: "customer" },
} as const

export const ORDER_NOTIFICATION_INBOX = "noreply@example.test"
