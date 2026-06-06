import { createClientOnlyFn } from "@tanstack/react-start";

import {
  CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY,
  CUSTOMER_ACTIVITY_PAGE_VIEW_STORAGE_PREFIX
} from "~/src/modules/customer-activity/customer-activity.constants";
import { customerActivityMutations } from "~/src/modules/customer-activity/customer-activity.mutations";
import type { CustomerActivity } from "~/src/modules/customer-activity/customer-activity.types";

const EMPTY_LENGTH = 0;

function fireAndForget(input: CustomerActivity["recordInput"]): void {
  void (async () => {
    try {
      await customerActivityMutations.recordCustomerActivityFn({ data: input });
    } catch {
      // Activity tracking must never interrupt storefront UX.
    }
  })();
}

export const trackCartItemAdded = createClientOnlyFn(
  (input: Omit<Extract<CustomerActivity["recordInput"], { kind: "cart_item_added" }>, "kind">) => {
    fireAndForget({ kind: "cart_item_added", ...input });
  }
);

export const trackCartAbandoned = createClientOnlyFn(
  (input: Omit<Extract<CustomerActivity["recordInput"], { kind: "cart_abandoned" }>, "kind">) => {
    if (sessionStorage.getItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY) === "1") {
      return;
    }

    sessionStorage.setItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY, "1");
    fireAndForget({ kind: "cart_abandoned", ...input });
  }
);

export const resetCartAbandonedTracking = createClientOnlyFn(() => {
  sessionStorage.removeItem(CUSTOMER_ACTIVITY_CART_ABANDONED_STORAGE_KEY);
});

export const trackPageViewed = createClientOnlyFn((path: string) => {
  if (path === "") {
    return;
  }

  const storageKey = `${CUSTOMER_ACTIVITY_PAGE_VIEW_STORAGE_PREFIX}${path}`;
  if (sessionStorage.getItem(storageKey) === "1") {
    return;
  }

  sessionStorage.setItem(storageKey, "1");
  fireAndForget({ kind: "page_viewed", path });
});

export function shouldTrackStorefrontPath(pathname: string): boolean {
  if (pathname.includes("/admin") || pathname.includes("/account")) {
    return false;
  }

  return pathname.length > EMPTY_LENGTH;
}
