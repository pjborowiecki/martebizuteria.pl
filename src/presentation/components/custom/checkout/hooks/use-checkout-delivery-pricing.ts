import { useMemo, useSyncExternalStore } from "react"

import { useQuery } from "@tanstack/react-query"
import { useWatch } from "react-hook-form"

import { useCartStore } from "~/src/modules/cart/cart.store"
import { resolveDeliveryPrice, resolveFreeDeliveryShortfall } from "~/src/modules/delivery-method/delivery-method.utils"
import { listDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-delivery-methods"
import { type DiscountCheckBasket, validateDiscountCodeQuery } from "~/src/modules/discount/use-cases/validate-discount-code"
import { getFreeDeliveryQuery } from "~/src/modules/store-setting/use-cases/get-free-delivery"

import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import {
  loadCheckoutSessionId,
  loadCheckoutSessionIdOnServer,
  subscribeToCheckoutSessionId,
} from "~/src/presentation/components/custom/checkout/lib/checkout-draft"
import { CHECKOUT_STEP_DEFINITIONS, CHECKOUT_STEP_ID } from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

const CONTACT_STEP_INDEX = CHECKOUT_STEP_DEFINITIONS.findIndex((step) => step.id === CHECKOUT_STEP_ID.CONTACT)

export const useCheckoutDiscountCheck = () => {
  const { activeStepIndex, control } = useCheckoutForm()
  const { items } = useCartStore()
  const [deliveryMethodId, email, discountCode] = useWatch({
    control,
    name: ["deliveryMethod", "email", "discountCode"],
  })
  const { data: deliveryMethods = [] } = useQuery(listDeliveryMethodsQuery())
  const heldSessionId = useSyncExternalStore(subscribeToCheckoutSessionId, loadCheckoutSessionId, loadCheckoutSessionIdOnServer)
  const selectedDeliveryMethod = deliveryMethods.find((method) => method.id === deliveryMethodId)
  const redemptionEmail = activeStepIndex > CONTACT_STEP_INDEX ? email : undefined
  const discountBasket = useMemo(
    (): DiscountCheckBasket => ({
      deliveryMethodId: selectedDeliveryMethod?.id,
      email: redemptionEmail,
      heldSessionId,
      lines: items.map((item) => ({ qty: item.qty, variantId: item.variantId })),
    }),
    [heldSessionId, items, redemptionEmail, selectedDeliveryMethod?.id],
  )
  const discountCheck = useQuery(validateDiscountCodeQuery({ ...discountBasket, code: discountCode }))

  return {
    discountBasket,
    discountCheck,
    enteredCode: discountCode === "" ? undefined : discountCode,
    selectedDeliveryMethod,
  }
}

export const useCheckoutDeliveryPricing = () => {
  const { discountCheck } = useCheckoutDiscountCheck()
  const { cartTotal } = useCartStore()
  const { data: freeDelivery } = useQuery(getFreeDeliveryQuery())
  const input = {
    discount: discountCheck.isSuccess ? discountCheck.data.applied : undefined,
    freeDeliveryThreshold: freeDelivery?.threshold,
    itemsSubtotal: cartTotal(),
  }

  return {
    priceOf: (price: number): number => resolveDeliveryPrice({ ...input, price }),
    shortfall: resolveFreeDeliveryShortfall(input),
  }
}
