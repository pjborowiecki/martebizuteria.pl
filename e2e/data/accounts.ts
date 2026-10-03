export const TEST_PASSWORD = "MarteE2ePassword123!"

export const TEST_ACCOUNTS = {
  admin: { email: "admin@marte.example.test", id: "e2e-admin", name: "Ada Admin", role: "admin" },
  customer: { email: "customer@marte.example.test", id: "e2e-customer", name: "Celina Klientka", role: "customer" },
} as const

export type TestAccountRole = keyof typeof TEST_ACCOUNTS
