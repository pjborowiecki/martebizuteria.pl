/**
 * The delivery fulfilment types the storefront offers. This is the single source
 * of truth for the `type` discriminator used across the delivery step, the
 * `deliveryMethod.type` column, and the order summary — never re-declare these
 * literals locally.
 */
export const DELIVERY_METHOD = {
  COURIER: "courier",
  IN_STORE: "in_store",
  LOCKER: "locker"
} as const;

/** Display order for the delivery type options (courier, then locker, then in-store). */
export const DELIVERY_METHODS = [DELIVERY_METHOD.COURIER, DELIVERY_METHOD.LOCKER, DELIVERY_METHOD.IN_STORE] as const;

export type DeliveryMethodType = (typeof DELIVERY_METHODS)[number];
