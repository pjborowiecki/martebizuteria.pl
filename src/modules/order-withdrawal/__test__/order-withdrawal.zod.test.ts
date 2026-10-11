import { describe, expect, it } from "vite-plus/test"

import { orderWithdrawalZodSchemas } from "~/src/modules/order-withdrawal/order-withdrawal.zod"

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const customerForm = { consumerName: "Anna Kowalska", orderItemIds: [], reason: "", scope: "order" } as const

const guestStatement = {
  consumerName: "Anna Kowalska",
  email: "anna@example.com",
  items: "",
  orderNumber: "MRT-2026-00042",
  reason: "",
  scope: "order",
} as const

const issuesOf = (schema: { safeParse: (input: unknown) => ParseResult }, input: unknown) =>
  schema.safeParse(input).error?.issues.map(({ message, path }) => ({ message, path }))

interface ParseResult {
  readonly error?: { readonly issues: readonly { readonly message: string; readonly path: readonly PropertyKey[] }[] } | undefined
}

describe("customer withdrawal statement", () => {
  it("accepts a whole-order statement without a reason and trims the name", () => {
    expect(orderWithdrawalZodSchemas.customerForm.parse({ ...customerForm, consumerName: "  Anna Kowalska " })).toStrictEqual(customerForm)
  })

  it("asks which products a partial statement covers", () => {
    expect(issuesOf(orderWithdrawalZodSchemas.customerForm, { ...customerForm, scope: "items" })).toStrictEqual([
      { message: "itemsRequired", path: ["orderItemIds"] },
    ])
  })

  it("requires the consumer's name and keeps it and the reason within their limits", () => {
    const blankName = { ...customerForm, consumerName: " ", reason: "x".repeat(2001) }
    const longName = { ...customerForm, consumerName: "x".repeat(257) }

    expect(issuesOf(orderWithdrawalZodSchemas.customerForm, blankName)).toStrictEqual([
      { message: "nameRequired", path: ["consumerName"] },
      { message: "reasonMaxLength", path: ["reason"] },
    ])
    expect(issuesOf(orderWithdrawalZodSchemas.customerForm, longName)).toStrictEqual([{ message: "nameMaxLength", path: ["consumerName"] }])
  })

  it("names the order the statement is about", () => {
    const input = { ...customerForm, orderId: ORDER_ID, orderItemIds: ["item-1"], scope: "items" }

    expect(orderWithdrawalZodSchemas.customerInput.parse(input)).toStrictEqual(input)
    expect(orderWithdrawalZodSchemas.customerInput.safeParse({ ...input, orderItemIds: [] }).success).toBe(false)
    expect(orderWithdrawalZodSchemas.customerInput.safeParse({ ...input, orderId: "" }).success).toBe(false)
  })
})

describe("guest withdrawal statement", () => {
  it("reads the order number in capitals and trims what the guest typed", () => {
    const typed = { ...guestStatement, email: " anna@example.com ", orderNumber: " mrt-2026-00042 " }

    expect(orderWithdrawalZodSchemas.guestForm.parse(typed)).toStrictEqual(guestStatement)
  })

  it("asks for the order number and a valid email", () => {
    const missing = { ...guestStatement, email: "anna", orderNumber: undefined }

    expect(issuesOf(orderWithdrawalZodSchemas.guestForm, missing)).toStrictEqual([
      { message: "emailInvalid", path: ["email"] },
      { message: "orderNumberRequired", path: ["orderNumber"] },
    ])
    expect(issuesOf(orderWithdrawalZodSchemas.guestForm, { ...guestStatement, orderNumber: " " })).toStrictEqual([
      { message: "orderNumberRequired", path: ["orderNumber"] },
    ])
  })

  it("asks which products a partial statement covers", () => {
    const partial = { ...guestStatement, items: "Kolczyki Luna × 1", scope: "items" }

    expect(orderWithdrawalZodSchemas.guestForm.parse(partial)).toStrictEqual(partial)
    expect(issuesOf(orderWithdrawalZodSchemas.guestForm, { ...partial, items: " " })).toStrictEqual([
      { message: "itemsRequired", path: ["items"] },
    ])
  })

  it("keeps the order number and the list of products within their limits", () => {
    const tooLong = { ...guestStatement, items: "x".repeat(2001), orderNumber: "M".repeat(33) }

    expect(issuesOf(orderWithdrawalZodSchemas.guestForm, tooLong)).toStrictEqual([
      { message: "itemsMaxLength", path: ["items"] },
      { message: "orderNumberMaxLength", path: ["orderNumber"] },
    ])
  })

  it("sends the statement with a bot-check token of at most 2048 characters", () => {
    const sent = { ...guestStatement, turnstileToken: "turnstile-token" }

    expect(orderWithdrawalZodSchemas.guestInput.parse(sent)).toStrictEqual(sent)
    expect(issuesOf(orderWithdrawalZodSchemas.guestInput, guestStatement)?.map(({ path }) => path)).toStrictEqual([["turnstileToken"]])
    expect(orderWithdrawalZodSchemas.guestInput.safeParse({ ...sent, turnstileToken: "x".repeat(2049) }).success).toBe(false)
    expect(issuesOf(orderWithdrawalZodSchemas.guestInput, { ...sent, items: " ", scope: "items" })).toStrictEqual([
      { message: "itemsRequired", path: ["items"] },
    ])
  })
})

describe("order id input", () => {
  it("requires an order id", () => {
    expect(orderWithdrawalZodSchemas.orderIdInput.parse({ orderId: ORDER_ID })).toStrictEqual({ orderId: ORDER_ID })
    expect(orderWithdrawalZodSchemas.orderIdInput.safeParse({ orderId: " " }).success).toBe(false)
  })
})
