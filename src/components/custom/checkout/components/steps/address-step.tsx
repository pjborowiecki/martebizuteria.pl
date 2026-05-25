"use client";

import { type JSX, useCallback } from "react";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { FieldGroup } from "~/src/components/shadcn/field";

import { CheckoutTextField } from "~/src/components/custom/checkout/components/checkout-fields";
import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";
import { CHECKOUT_STEP_ID } from "~/src/components/custom/checkout/lib/checkout-steps";

export function AddressStep(): JSX.Element {
  const t = useTranslations("checkoutPage.checkoutForm");
  const { control, isPending, onNext } = useCheckoutForm();

  const handleContinue = useCallback(
    (e: React.MouseEvent) => {
      void onNext(CHECKOUT_STEP_ID.BILLING, e);
    },
    [onNext]
  );

  return (
    <div className="flex flex-col gap-8">
      <FieldGroup className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <CheckoutTextField control={control} name="firstName" label={t("firstName")} />
        <CheckoutTextField control={control} name="lastName" label={t("lastName")} />
        <CheckoutTextField control={control} name="addressLine1" label={t("addressLine1")} className="sm:col-span-2" />
        <CheckoutTextField control={control} name="postCode" label={t("postalCode")} />
        <CheckoutTextField control={control} name="city" label={t("city")} />
        <CheckoutTextField control={control} name="country" label={t("country")} className="sm:col-span-2" disabled />
      </FieldGroup>

      <div className="pt-2">
        <Button
          size="lg"
          onClick={handleContinue}
          className="group min-h-11 w-full cursor-pointer rounded-none px-8 tracking-[0.2em] uppercase sm:w-auto"
          disabled={isPending}
        >
          {t("continueToDelivery")}
          <ArrowRight aria-hidden className="ml-2 size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.15} />
        </Button>
      </div>
    </div>
  );
}
