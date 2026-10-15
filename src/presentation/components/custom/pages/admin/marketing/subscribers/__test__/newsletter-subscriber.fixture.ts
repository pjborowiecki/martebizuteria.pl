import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

export const buildSubscriber = (overrides: Partial<Newsletter["adminListItem"]> = {}): Newsletter["adminListItem"] => ({
  confirmedAt: new Date("2026-03-01T11:00:00.000Z"),
  createdAt: new Date("2026-03-01T10:00:00.000Z"),
  email: "anna@example.com",
  id: "5f0c2a8e-1b3d-4c5e-8f9a-0b1c2d3e4f50",
  locale: "pl-PL",
  source: "landing",
  status: "confirmed",
  unsubscribedAt: undefined,
  userId: undefined,
  ...overrides,
})

export const buildNewsletterStats = (overrides: Partial<Newsletter["adminStats"]> = {}): Newsletter["adminStats"] => ({
  confirmed: 12,
  pending: 3,
  total: 20,
  unsubscribed: 5,
  ...overrides,
})
