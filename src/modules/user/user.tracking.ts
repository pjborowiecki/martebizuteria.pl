import { createClientOnlyFn } from "@tanstack/react-start"

import { recordCustomerActivity } from "~/src/modules/user/use-cases/record-customer-activity"
import { CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY, CUSTOMER_ACTIVITY_PAGE_VIEW_STORAGE_PREFIX } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

const fireAndForget = (input: User["customerActivityRecordInput"]): void => {
  void (async () => {
    try {
      await recordCustomerActivity({
        data: input,
      })
    } catch {}
  })()
}

export const shouldTrackStorefrontPath = (pathname: string): boolean => {
  if (pathname.includes("/admin") || pathname.includes("/account")) {
    return false
  }

  return pathname.length > 0
}

export const trackCartItemAdded = createClientOnlyFn(
  (
    input: Omit<
      Extract<
        User["customerActivityRecordInput"],
        {
          kind: "cart_item_added"
        }
      >,
      "kind"
    >,
  ) => {
    fireAndForget({
      kind: "cart_item_added",
      ...input,
    })
  },
)

export const trackCartAbandoned = createClientOnlyFn(
  (
    input: Omit<
      Extract<
        User["customerActivityRecordInput"],
        {
          kind: "cart_abandoned"
        }
      >,
      "kind"
    >,
  ) => {
    if (sessionStorage.getItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY) === "1") {
      return
    }
    sessionStorage.setItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY, "1")
    fireAndForget({
      kind: "cart_abandoned",
      ...input,
    })
  },
)

export const resetCartAbandonedTracking = createClientOnlyFn(() => {
  sessionStorage.removeItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY)
})

export const trackPageViewed = createClientOnlyFn((path: string) => {
  if (path === "") {
    return
  }

  const storageKey = `${CUSTOMER_ACTIVITY_PAGE_VIEW_STORAGE_PREFIX}${path}`
  if (sessionStorage.getItem(storageKey) === "1") {
    return
  }
  sessionStorage.setItem(storageKey, "1")
  fireAndForget({
    kind: "page_viewed",
    path,
  })
})
