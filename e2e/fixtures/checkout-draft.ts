import { type Page } from "@playwright/test"

import { PARCEL_LOCKER, SHIPPING_ADDRESS } from "../data/catalog"

const CHECKOUT_DRAFT_STORAGE_KEY = "marte-checkout-draft"

const CHECKOUT_DRAFT_VERSION = 1

const HELD_CHECKOUT_SESSION_STORAGE_KEY = "marte-checkout-session"

export const keepCheckoutDraft = async (page: Page, values: Readonly<Record<string, string | boolean>>): Promise<void> => {
  await page.evaluate(
    ({ draft, key }) => {
      sessionStorage.setItem(key, JSON.stringify(draft))
    },
    { draft: { v: CHECKOUT_DRAFT_VERSION, values }, key: CHECKOUT_DRAFT_STORAGE_KEY },
  )
}

export const lockerCheckoutDraft = (email: string, lockerId: string): Readonly<Record<string, string | boolean>> => ({
  ...SHIPPING_ADDRESS,
  countryCode: "PL",
  deliveryMethod: PARCEL_LOCKER.id,
  deliveryMethodType: "locker",
  email,
  lockerId,
  sameAsShipping: true,
})

export const heldCheckoutSessionId = (page: Page): Promise<unknown> =>
  page.evaluate((key) => {
    const held = localStorage.getItem(key)

    return held === null ? undefined : (JSON.parse(held) as { sessionId?: unknown }).sessionId
  }, HELD_CHECKOUT_SESSION_STORAGE_KEY)
