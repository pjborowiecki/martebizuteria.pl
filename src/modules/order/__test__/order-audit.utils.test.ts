import { describe, expect, it } from "vite-plus/test"

import { buildOrderRefundAuditChange, buildOrderStepBackAuditChange } from "~/src/modules/order/order-audit.utils"

describe("buildOrderRefundAuditChange", () => {
  it("records nothing when the refund changed no tracked field", () => {
    expect(buildOrderRefundAuditChange({ paymentStatus: "succeeded" }, { paymentStatus: "succeeded" })).toStrictEqual({})
  })

  it("keeps each changed field's old and new value, and no English summary, for the log to word itself", () => {
    const change = buildOrderRefundAuditChange(
      { orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 0 },
      { orderStatus: "refunded", paymentStatus: "refunded", refundedAmount: 30_000 },
    )

    expect(change).toStrictEqual({
      metadata: {
        changed: ["orderStatus", "paymentStatus", "refundedAmount"],
        new: { orderStatus: "refunded", paymentStatus: "refunded", refundedAmount: 30_000 },
        old: { orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 0 },
      },
    })
  })

  it("keeps the old and new values plus the changed list in the metadata", () => {
    const change = buildOrderRefundAuditChange({ paymentStatus: "succeeded" }, { paymentStatus: "refunded" })

    expect(change.metadata).toStrictEqual({
      changed: ["paymentStatus"],
      new: { paymentStatus: "refunded" },
      old: { paymentStatus: "succeeded" },
    })
  })

  it("records only the fields that actually moved", () => {
    const change = buildOrderRefundAuditChange(
      { orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 0 },
      { orderStatus: "processing", paymentStatus: "succeeded", refundedAmount: 5000 },
    )

    expect(change.metadata).toMatchObject({ changed: ["refundedAmount"] })
  })

  it("treats a field appearing for the first time as a change", () => {
    const change = buildOrderRefundAuditChange({ paymentStatus: "succeeded" }, { paymentStatus: "succeeded", refundedAmount: 5000 })

    expect(change.metadata).toStrictEqual({
      changed: ["refundedAmount"],
      new: { refundedAmount: 5000 },
      old: { refundedAmount: undefined },
    })
  })
})

describe("buildOrderStepBackAuditChange", () => {
  it("keeps the step the order left and the step it returned to", () => {
    expect(
      buildOrderStepBackAuditChange(
        { fulfillmentStep: "shipped", orderStatus: "processing" },
        { fulfillmentStep: "processing", orderStatus: "processing" },
      ),
    ).toStrictEqual({
      metadata: { changed: ["fulfillmentStep"], new: { fulfillmentStep: "processing" }, old: { fulfillmentStep: "shipped" } },
    })
  })

  it("adds the order status when a delivered order reopens", () => {
    expect(
      buildOrderStepBackAuditChange(
        { fulfillmentStep: "delivered", orderStatus: "completed" },
        { fulfillmentStep: "shipped", orderStatus: "processing" },
      ).metadata,
    ).toMatchObject({ changed: ["fulfillmentStep", "orderStatus"] })
  })
})
