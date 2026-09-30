import { createTableRelationsHelpers, getTableName } from "drizzle-orm"
import { describe, expect, it } from "vite-plus/test"

import { payment, paymentRelations } from "~/src/modules/payment/payment.schema"

const relations = paymentRelations.config(createTableRelationsHelpers(payment))

describe("paymentRelations", () => {
  it("declares only the checkout side", () => {
    expect(Object.keys(relations)).toStrictEqual(["checkout"])
  })

  it("joins a payment to the checkout it settles", () => {
    expect(getTableName(relations.checkout.referencedTable)).toBe("checkout")
    expect(relations.checkout.config?.fields.map((field) => field.name)).toStrictEqual(["checkout_id"])
    expect(relations.checkout.config?.references.map((reference) => reference.name)).toStrictEqual(["id"])
  })

  it("joins through a column every payment must carry", () => {
    expect(relations.checkout.config?.fields[0]?.notNull).toBe(true)
  })

  it("hangs off the payment table", () => {
    expect(getTableName(paymentRelations.table)).toBe("payment")
  })
})
