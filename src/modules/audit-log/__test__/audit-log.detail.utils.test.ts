import { describe, expect, it } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLogDetailSource, describeAuditLogDetail } from "~/src/modules/audit-log/audit-log.detail.utils"

const describeRow = (action: string, detail: string | null, metadata?: Record<string, unknown>) =>
  describeAuditLogDetail({ action, detail, metadata } satisfies AuditLogDetailSource)

const emailSent = (detail: string | null, metadata?: Record<string, unknown>) => describeRow(AUDIT_LOG_ACTION.EMAIL_SENT, detail, metadata)

describe("describeAuditLogDetail for plain text", () => {
  it("passes the detail of an event with nothing to translate through as text", () => {
    expect(describeRow(AUDIT_LOG_ACTION.ORDER_SHIPPED, "00259007123456789012")).toStrictEqual({
      kind: "text",
      text: "00259007123456789012",
    })
  })

  it.each([[null], ["   "]])("records no detail for %j", (detail) => {
    expect(describeRow(AUDIT_LOG_ACTION.ORDER_SHIPPED, detail)).toBeUndefined()
  })
})

describe("describeAuditLogDetail for e-mails", () => {
  it("names an order e-mail by the key it was sent under and keeps its recipient", () => {
    expect(emailSent("Order confirmation → delivered@resend.dev", { idempotencyKey: "order-confirmation/order-1" })).toStrictEqual({
      dailyLimit: undefined,
      emailKind: "order-confirmation",
      failure: undefined,
      kind: "email",
      recipient: "delivered@resend.dev",
    })
  })

  it("keeps the reason a delivery failed, dashes included", () => {
    expect(
      describeRow(AUDIT_LOG_ACTION.EMAIL_FAILED, "New order notification → kontakt@marte.test — Resend refused — try later", {
        idempotencyKey: "new-order/order-1",
      }),
    ).toMatchObject({ emailKind: "new-order", failure: "Resend refused — try later", recipient: "kontakt@marte.test" })
  })

  it("keeps the reason of an e-mail that failed before it had a recipient", () => {
    expect(
      describeRow(AUDIT_LOG_ACTION.EMAIL_DEFERRED, "Order refunded — The order could not be found", {
        idempotencyKey: "order-refunded/order-1/5000",
      }),
    ).toMatchObject({ emailKind: "order-refunded", failure: "The order could not be found", recipient: undefined })
  })

  it("names a resend recorded before it carried its key by the label it copied", () => {
    expect(describeRow(AUDIT_LOG_ACTION.EMAIL_RESEND_REQUESTED, "Order shipped → anna@example.com — Resend timed out")).toMatchObject({
      emailKind: "order-shipped",
      failure: "Resend timed out",
      recipient: "anna@example.com",
    })
  })

  it.each([
    ["Auth change-email confirmation email — Domain not verified", "change-email"],
    ["Auth verification email — Domain not verified", "verification"],
    ["Newsletter already-subscribed notice — Domain not verified", "newsletter-already-subscribed"],
    ["Newsletter campaign — Domain not verified", "newsletter-campaign"],
    ["Withdrawal notice → kontakt@marte.test — Domain not verified", "order-withdrawal-notice"],
  ])("names the e-mail of the stored failure %j", (detail, emailKind) => {
    expect(describeRow(AUDIT_LOG_ACTION.EMAIL_FAILED, detail)).toMatchObject({ emailKind, failure: "Domain not verified" })
  })

  it("turns a stored daily limit refusal into the limit itself", () => {
    expect(
      describeRow(
        AUDIT_LOG_ACTION.EMAIL_FAILED,
        "Public newsletter email — the shop reached its daily limit of 50 emails that visitors can request",
      ),
    ).toStrictEqual({
      dailyLimit: 50,
      emailKind: "newsletter-subscription",
      failure: undefined,
      kind: "email",
      recipient: undefined,
    })
  })

  it("reads the e-mail kind a failure recorded with its reason as the whole detail", () => {
    expect(describeRow(AUDIT_LOG_ACTION.EMAIL_FAILED, "Domain → not — verified", { emailKind: "reset-password" })).toStrictEqual({
      dailyLimit: undefined,
      emailKind: "reset-password",
      failure: "Domain → not — verified",
      kind: "email",
    })
  })

  it("reads the daily limit a refusal recorded without a detail", () => {
    expect(describeRow(AUDIT_LOG_ACTION.EMAIL_FAILED, null, { dailyLimit: 50, emailKind: "verification" })).toStrictEqual({
      dailyLimit: 50,
      emailKind: "verification",
      failure: undefined,
      kind: "email",
    })
  })

  it("keeps the text of an e-mail it cannot name", () => {
    expect(emailSent("Something else → anna@example.com", { idempotencyKey: "admin-order-refund-1" })).toStrictEqual({
      kind: "text",
      text: "Something else → anna@example.com",
    })
  })

  it("records no detail for an e-mail entry without one", () => {
    expect(emailSent(null)).toBeUndefined()
  })
})

describe("describeAuditLogDetail for counts", () => {
  it("counts the items of an abandoned cart from its metadata, whatever text the row kept", () => {
    expect(describeRow(AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED, "4 items in cart", { itemCount: 4, lineCount: 2 })).toStrictEqual({
      kind: "message",
      message: "cartItemCount",
      values: { count: 4 },
    })
  })

  it("counts the confirmed subscribers a newsletter went to", () => {
    expect(describeRow(AUDIT_LOG_ACTION.NEWSLETTER_SENT, null, { recipientCount: 12 })).toStrictEqual({
      kind: "message",
      message: "recipientCount",
      values: { count: 12 },
    })
  })

  it.each([[AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED], [AUDIT_LOG_ACTION.NEWSLETTER_SENT]])(
    "keeps the text of a %s entry without counts",
    (action) => {
      expect(describeRow(action, "3 things")).toStrictEqual({ kind: "text", text: "3 things" })
    },
  )
})

describe("describeAuditLogDetail for a kept account", () => {
  it.each([["Stripe customer not deleted, account kept — Error: stripe is unreachable"], ["Error: stripe is unreachable"]])(
    "keeps only the Stripe error of %j",
    (detail) => {
      expect(describeRow(AUDIT_LOG_ACTION.CUSTOMER_DELETION_FAILED, detail)).toStrictEqual({
        kind: "message",
        message: "stripeCustomerKept",
        values: { error: "Error: stripe is unreachable" },
      })
    },
  )

  it("records no detail for a kept account without an error", () => {
    expect(describeRow(AUDIT_LOG_ACTION.CUSTOMER_DELETION_FAILED, null)).toBeUndefined()
  })
})

describe("describeAuditLogDetail for coded values", () => {
  it("reads a redeemed coupon's minor units as an amount", () => {
    expect(describeRow(AUDIT_LOG_ACTION.DISCOUNT_REDEEMED, "1500")).toStrictEqual({
      kind: "values",
      values: [{ field: "amount", value: 1500 }],
    })
  })

  it("keeps a redeemed amount it cannot read as text", () => {
    expect(describeRow(AUDIT_LOG_ACTION.DISCOUNT_REDEEMED, "15 zł")).toStrictEqual({ kind: "text", text: "15 zł" })
  })

  it("reads the role an account changed to", () => {
    expect(describeRow(AUDIT_LOG_ACTION.AUTH_ROLE_CHANGED, "admin")).toStrictEqual({
      kind: "values",
      values: [{ field: "role", value: "admin" }],
    })
  })

  it("reads the reason and status of an opened dispute", () => {
    expect(describeRow(AUDIT_LOG_ACTION.ORDER_DISPUTE_OPENED, "fraudulent — needs_response")).toStrictEqual({
      kind: "values",
      values: [
        { field: "disputeReason", value: "fraudulent" },
        { field: "disputeStatus", value: "needs_response" },
      ],
    })
  })

  it.each([["fraudulent"], ["fraudulent — needs_response — again"]])("keeps the opened dispute %j it cannot split as text", (detail) => {
    expect(describeRow(AUDIT_LOG_ACTION.ORDER_DISPUTE_OPENED, detail)).toStrictEqual({ kind: "text", text: detail })
  })

  it("reads the status a dispute closed with", () => {
    expect(describeRow(AUDIT_LOG_ACTION.ORDER_DISPUTE_CLOSED, "won")).toStrictEqual({
      kind: "values",
      values: [{ field: "disputeStatus", value: "won" }],
    })
  })

  it.each([[AUDIT_LOG_ACTION.AUTH_ROLE_CHANGED], [AUDIT_LOG_ACTION.ORDER_DISPUTE_CLOSED], [AUDIT_LOG_ACTION.ORDER_DISPUTE_OPENED]])(
    "records no detail for a %s entry without one",
    (action) => {
      expect(describeRow(action, null)).toBeUndefined()
    },
  )
})
