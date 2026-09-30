import { expect, it } from "vite-plus/test"

import {
  ADMIN_ORDER_FULFILLMENT_UI_KEY,
  ADMIN_ORDER_PAYMENT_UI_KEY,
  ADMIN_ORDER_STATUSES,
  ORDER_TABS,
  isAdminOrderFulfillmentUiKey,
  isAdminOrderPaymentUiKey,
  isAdminOrderStatus,
  isAdminOrderTab,
} from "~/src/modules/order/order.constants"

const PAYMENT_UI_KEYS = Object.values(ADMIN_ORDER_PAYMENT_UI_KEY)

const FULFILLMENT_UI_KEYS = Object.values(ADMIN_ORDER_FULFILLMENT_UI_KEY)

it.each([
  { check: isAdminOrderTab, invalid: "archived", valid: "all" },
  { check: isAdminOrderStatus, invalid: "shipped", valid: "completed" },
  { check: isAdminOrderPaymentUiKey, invalid: "succeeded", valid: "paid" },
  { check: isAdminOrderFulfillmentUiKey, invalid: "not_fulfilled", valid: "unfulfilled" },
])("distinguishes the public order filter key $valid from $invalid", ({ check, valid, invalid }) => {
  expect(check(valid)).toBe(true)
  expect(check(invalid)).toBe(false)
})

it.each(ORDER_TABS)("restores the order tab %s from a url that carries it", (tab) => {
  expect(isAdminOrderTab(tab)).toBe(true)
})

it.each(ADMIN_ORDER_STATUSES)("accepts the stored order status %s as an admin status filter", (status) => {
  expect(isAdminOrderStatus(status)).toBe(true)
})

it.each(PAYMENT_UI_KEYS)("accepts the payment badge key %s", (key) => {
  expect(isAdminOrderPaymentUiKey(key)).toBe(true)
})

it.each(FULFILLMENT_UI_KEYS)("accepts the fulfillment badge key %s", (key) => {
  expect(isAdminOrderFulfillmentUiKey(key)).toBe(true)
})

it.each(["shipped", "delivered", "returned"])("keeps the fulfillment key %s out of the stored order statuses", (key) => {
  expect(isAdminOrderFulfillmentUiKey(key)).toBe(true)
  expect(isAdminOrderStatus(key)).toBe(false)
})

it.each(["processing", "completed", "cancelled", "refunded"])("keeps the stored status %s off the order tab bar", (status) => {
  expect(isAdminOrderStatus(status)).toBe(true)
  expect(isAdminOrderTab(status)).toBe(false)
})

it.each(["paid", "authorized", "refunded"])("keeps the payment key %s off the fulfillment badge keys", (key) => {
  expect(isAdminOrderPaymentUiKey(key)).toBe(true)
  expect(isAdminOrderFulfillmentUiKey(key)).toBe(false)
})
