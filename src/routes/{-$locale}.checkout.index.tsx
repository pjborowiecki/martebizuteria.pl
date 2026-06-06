import { type JSX, Suspense, useEffect, useMemo } from "react";

import { ClientOnly, createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";

import { CheckoutFormSkeleton } from "~/src/components/custom/checkout/components/checkout-form-skeleton";
import { CheckoutForm } from "~/src/components/custom/checkout/components/checkout-form.client";
import { CheckoutSuccess } from "~/src/components/custom/checkout/components/checkout-success";

import { useCartHydrated, useCartStore } from "~/src/stores/cart.store";

const EMPTY_COUNT = 0;

export const Route = createFileRoute("/{-$locale}/checkout/")({
  component: CheckoutPage
});

function CheckoutPage(): JSX.Element {
  const search = useSearch({ from: "/{-$locale}/checkout" });

  if (search.success === true) {
    return <CheckoutSuccess />;
  }

  return <CheckoutGuard />;
}

// Checkout is unreachable with an empty cart: returning shoppers (or anyone who
// removed their last item) are sent back to the cart page, which owns the
// canonical empty-state UI. The redirect waits for the persisted cart to
// hydrate so a customer with items is never bounced on the first paint.
function CheckoutGuard(): JSX.Element {
  const navigate = useNavigate();
  const hydrated = useCartHydrated();
  const itemCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.qty, EMPTY_COUNT));
  const fallback = useMemo(() => <CheckoutFormSkeleton />, []);

  const isEmpty = hydrated && itemCount === EMPTY_COUNT;

  useEffect(() => {
    if (isEmpty) {
      void navigate({ params: (prev) => prev, replace: true, to: "/{-$locale}/cart" });
    }
  }, [isEmpty, navigate]);

  if (!hydrated || itemCount === EMPTY_COUNT) {
    return fallback;
  }

  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <CheckoutForm />
      </Suspense>
    </ClientOnly>
  );
}
