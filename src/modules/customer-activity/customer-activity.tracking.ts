import { createClientOnlyFn } from "@tanstack/react-start"

import {
  CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY,
  CUSTOMER_ACTIVITY_PAGE_VIEW_STORAGE_PREFIX,
} from "~/src/modules/customer-activity/customer-activity.constants"
import { type CustomerActivity } from "~/src/modules/customer-activity/customer-activity.types"
import { recordCustomerActivity } from "~/src/modules/customer-activity/use-cases/record-customer-activity"

const fireAndForget = (input: CustomerActivity["recordInput"]): void => {
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
        CustomerActivity["recordInput"],
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
        CustomerActivity["recordInput"],
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
