import { type JSX, Suspense, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { CheckoutForm } from "~/src/components/custom/checkout/components/checkout-form";
import { CheckoutFormSkeleton } from "~/src/components/custom/checkout/components/checkout-form-skeleton";

export const Route = createFileRoute("/{-$locale}/checkout/")({
  component: CheckoutPage
});

function CheckoutPage(): JSX.Element {
  const fallback = useMemo(() => <CheckoutFormSkeleton />, []);

  return (
    <Suspense fallback={fallback}>
      <CheckoutForm />
    </Suspense>
  );
}
