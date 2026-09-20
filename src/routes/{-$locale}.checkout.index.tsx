import { type JSX, Suspense, useEffect, useMemo } from "react"

import { ClientOnly, createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"

import { useCartAvailability } from "~/src/hooks/use-cart-availability"

import { CheckoutFormSkeleton } from "~/src/presentation/components/custom/checkout/components/checkout-form-skeleton"
import { CheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form.client"
import { CheckoutSuccess } from "~/src/presentation/components/custom/checkout/components/checkout-success"

import { useCartHydrated, useCartStore } from "~/src/stores/cart.store"
const CheckoutPage = (): JSX.Element => {
  const search = useSearch({
    from: "/{-$locale}/checkout",
  })
  if (search.success === true) {
    return <CheckoutSuccess />
  }
  return <CheckoutGuard />
}

/**
 * Checkout is unreachable with an empty cart: returning shoppers (or anyone who removed their last item) are
 * sent back to the cart page, which owns the canonical empty-state UI. The redirect waits for the persisted
 * cart to hydrate so a customer with items is never bounced on the first paint.
 */
const CheckoutGuard = (): JSX.Element => {
  const navigate = useNavigate()
  const hydrated = useCartHydrated()
  const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.qty, 0))
  const { hasUnavailableItems, isChecking } = useCartAvailability()
  const fallback = useMemo(() => <CheckoutFormSkeleton />, [])
  const isEmpty = hydrated && itemCount === 0
  const hasStockIssues = hydrated && !isChecking && hasUnavailableItems
  useEffect(() => {
    if (isEmpty || hasStockIssues) {
      void navigate({
        params: (prev) => prev,
        replace: true,
        to: "/{-$locale}/cart",
      })
    }
  }, [hasStockIssues, isEmpty, navigate])
  if (!hydrated || itemCount === 0 || isChecking || hasUnavailableItems) {
    return fallback
  }
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <CheckoutForm />
      </Suspense>
    </ClientOnly>
  )
}
export const Route = createFileRoute("/{-$locale}/checkout/")({
  component: CheckoutPage,
})
