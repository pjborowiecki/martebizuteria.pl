import { describe, expect, it, vi } from "vite-plus/test"

vi.mock(import("better-auth/api"), async (importOriginal) => ({ ...(await importOriginal()), getIP: () => null }))

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))

const { IP_ADDRESS_HEADER, clientAddress } = await import("~/src/lib/rate-limit")

describe("client address without a resolvable IP", () => {
  it("shares one bucket instead of skipping the limit", () => {
    expect(clientAddress(new Headers({ [IP_ADDRESS_HEADER]: "203.0.113.1" }))).toBe("unknown")
  })
})
