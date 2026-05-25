"use client";

import type { JSX } from "react";

import { CreditCard } from "lucide-react";
import { useTranslations } from "use-intl";

import { FieldGroup } from "~/src/components/shadcn/field";

import { CheckoutAddonField, CheckoutCheckboxField, CheckoutTextField } from "~/src/components/custom/checkout/components/checkout-fields";
import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";

const cardAddon = <CreditCard aria-hidden className="size-4 text-muted-foreground" />;

export function PaymentCard(): JSX.Element {
  const t = useTranslations("checkoutPage.checkoutForm");
  const { control } = useCheckoutForm();

  return (
    <FieldGroup className="grid gap-6 sm:grid-cols-2">
      <CheckoutTextField
        control={control}
        name="cardholderName"
        label={t("cardholderName")}
        className="sm:col-span-2"
        autoComplete="cc-name"
      />
      <CheckoutAddonField
        control={control}
        name="cardNumber"
        label={t("cardNumber")}
        className="sm:col-span-2"
        inputMode="numeric"
        autoComplete="cc-number"
        addon={cardAddon}
      />
      <CheckoutTextField control={control} name="cardExpiry" label={t("cardExpiry")} placeholder="MM / YY" autoComplete="cc-exp" />
      <CheckoutTextField control={control} name="cardCvv" label={t("cardCvv")} inputMode="numeric" autoComplete="cc-csc" />
      <CheckoutCheckboxField control={control} name="saveCard" label={t("saveCard")} />
    </FieldGroup>
  );
}
