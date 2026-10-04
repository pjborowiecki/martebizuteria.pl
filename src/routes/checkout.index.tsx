import { type JSX, Suspense, useEffect, useMemo } from "react"

import { noop } from "@tanstack/react-query"
import { ClientOnly, createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"

import { useCartHydrated, useCartStore } from "~/src/modules/cart/cart.store"
import { listDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-delivery-methods"

import { useCartAvailability } from "~/src/hooks/use-cart-availability"

import { CheckoutFormSkeleton } from "~/src/presentation/components/custom/checkout/components/checkout-form-skeleton"
import { CheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form.client"
import { CheckoutSuccess } from "~/src/presentation/components/custom/checkout/components/checkout-success"

const CheckoutPage = (): JSX.Element => {
  const search = useSearch({
    from: "/checkout",
  })

  if (search.success === true) {
    return <CheckoutSuccess sessionId={search.session_id ?? ""} />
  }

  return <CheckoutGuard />
}

const CheckoutGuard = (): JSX.Element => {
  const navigate = useNavigate()
  const hydrated = useCartHydrated()
  const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.qty, 0))
  const { hasUnavailableItems, isChecking, isFirstCheck } = useCartAvailability()
  const fallback = useMemo(() => <CheckoutFormSkeleton />, [])
  const isEmpty = hydrated && itemCount === 0
  const hasStockIssues = hydrated && !isChecking && hasUnavailableItems
  useEffect(() => {
    if (isEmpty || hasStockIssues) {
      void navigate({
        params: (prev) => prev,
        replace: true,
        to: "/cart",
      })
    }
  }, [hasStockIssues, isEmpty, navigate])

  if (!hydrated || itemCount === 0 || isFirstCheck || hasUnavailableItems) {
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

export const Route = createFileRoute("/checkout/")({
  component: CheckoutPage,
  loader: async ({ context, deps }) => {
    if (deps.success !== true) {
      await context.queryClient
        .query({
          ...listDeliveryMethodsQuery(),
          staleTime: "static",
        })
        .catch(noop)
    }
  },
  loaderDeps: ({ search }: { search: { success?: boolean | undefined } }) => ({ success: search.success }),
})
