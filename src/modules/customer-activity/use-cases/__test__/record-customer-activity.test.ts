import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { recordCustomerActivity } from "../record-customer-activity"

const session = vi.hoisted(() => ({
  get: vi.fn(() =>
    Promise.resolve<{ user: { email: string; id: string } } | undefined>({ user: { email: "shopper@example.test", id: "user-1" } }),
  ),
}))

const audits = vi.hoisted(() => ({
  abandoned: vi.fn(),
  itemAdded: vi.fn(),
  pageViewed: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: session.get }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCustomerCartAbandonedAudit: audits.abandoned,
  recordCustomerCartItemAddedAudit: audits.itemAdded,
  recordCustomerPageViewedAudit: audits.pageViewed,
  resolveAuthAuditActor: (user: { email: string }) => user.email,
}))
vi.mock("~/src/modules/audit-log/audit-log.record.server", () => ({ resolveRequestAuditIp: () => "198.51.100.4" }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options?: { data?: unknown }) =>
        handler({ data: builder.validate(options?.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate
        return builder
      },
    }

    return builder
  },
}))

describe("recordCustomerActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    session.get.mockResolvedValue({ user: { email: "shopper@example.test", id: "user-1" } })
  })

  it("records nothing for an anonymous visitor", async () => {
    session.get.mockResolvedValue(undefined)

    await expect(recordCustomerActivity({ data: { kind: "page_viewed", path: "/products" } })).resolves.toStrictEqual({
      ok: true,
      recorded: false,
    })
    expect(audits.pageViewed).not.toHaveBeenCalled()
  })

  it("builds a cart detail without a quantity suffix for a single unit", async () => {
    await expect(
      recordCustomerActivity({
        data: { kind: "cart_item_added", productTitle: "Silver ring", quantity: 1, variantId: "variant-1" },
      }),
    ).resolves.toStrictEqual({ ok: true, recorded: true })

    expect(audits.itemAdded).toHaveBeenCalledWith("shopper@example.test", {
      detail: "Silver ring",
      ip: "198.51.100.4",
      metadata: { productTitle: "Silver ring", quantity: 1, variantId: "variant-1", variantTitle: undefined },
      resourceId: "user-1",
    })
  })

  it("appends the variant title and the multiplied quantity to the cart detail", async () => {
    await recordCustomerActivity({
      data: { kind: "cart_item_added", productTitle: "Silver ring", quantity: 3, variantId: "variant-2", variantTitle: "Size 12" },
    })

    expect(audits.itemAdded.mock.calls[0]?.[1]).toMatchObject({ detail: "Silver ring (Size 12) ×3" })
  })

  it("treats an empty variant title as no variant", async () => {
    await recordCustomerActivity({
      data: { kind: "cart_item_added", productTitle: "Silver ring", quantity: 2, variantId: "variant-3", variantTitle: "" },
    })

    expect(audits.itemAdded.mock.calls[0]?.[1]).toMatchObject({ detail: "Silver ring ×2" })
  })

  it("records an abandoned cart with its item and line counts", async () => {
    await recordCustomerActivity({ data: { itemCount: 4, kind: "cart_abandoned", lineCount: 2 } })

    expect(audits.abandoned).toHaveBeenCalledWith("shopper@example.test", {
      detail: "4 items in cart",
      ip: "198.51.100.4",
      metadata: { itemCount: 4, lineCount: 2 },
      resourceId: "user-1",
    })
    expect(audits.itemAdded).not.toHaveBeenCalled()
  })

  it("records a page view with the path as both detail and metadata", async () => {
    await recordCustomerActivity({ data: { kind: "page_viewed", path: "/products/silver-ring" } })

    expect(audits.pageViewed).toHaveBeenCalledWith("shopper@example.test", {
      detail: "/products/silver-ring",
      ip: "198.51.100.4",
      metadata: { path: "/products/silver-ring" },
      resourceId: "user-1",
    })
  })
})

it("rejects invalid activity before reading the session or recording an audit", () => {
  vi.clearAllMocks()
  expect(() => recordCustomerActivity({ data: { itemCount: -1, kind: "cart_abandoned", lineCount: 0 } })).toThrow()
  expect(session.get).not.toHaveBeenCalled()
  expect(audits.pageViewed).not.toHaveBeenCalled()
})
