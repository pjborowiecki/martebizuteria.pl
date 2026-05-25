import type { JSX } from "react";

import { CheckoutFormProvider } from "~/src/components/custom/checkout/components/checkout-form-provider";
import { CheckoutStep } from "~/src/components/custom/checkout/components/checkout-step";
import { CHECKOUT_STEPS } from "~/src/components/custom/checkout/lib/checkout-steps";

export function CheckoutForm(): JSX.Element {
  return (
    <CheckoutFormProvider>
      <div className="flex flex-col gap-4 md:gap-6">
        {CHECKOUT_STEPS.map((stepConfig, index) => (
          <CheckoutStep key={stepConfig.id} stepConfig={stepConfig} stepIndex={index} />
        ))}
      </div>
    </CheckoutFormProvider>
  );
}
