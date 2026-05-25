"use client";

import { type JSX, useCallback } from "react";

import { ArrowRight, Building, CreditCard, Smartphone } from "lucide-react";
import { useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";

import { CheckoutRadioField, RadioCard } from "~/src/components/custom/checkout/components/checkout-fields";
import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";
import { PaymentBank } from "~/src/components/custom/checkout/components/substeps/payment-bank";
import { PaymentBlik } from "~/src/components/custom/checkout/components/substeps/payment-blik";
import { PaymentCard } from "~/src/components/custom/checkout/components/substeps/payment-card";
import { CHECKOUT_STEP_ID } from "~/src/components/custom/checkout/lib/checkout-steps";

const cardIcon = <CreditCard className="size-6" strokeWidth={1.25} />;
const blikIcon = <Smartphone className="size-6" strokeWidth={1.25} />;
const bankIcon = <Building className="size-6" strokeWidth={1.25} />;

function PaymentSubstep({ method }: Readonly<{ method: string }>): JSX.Element | undefined {
  if (method === CONSTANTS.PAYMENT_METHOD.CARD) {
    return <PaymentCard />;
  }
  if (method === CONSTANTS.PAYMENT_METHOD.BLIK) {
    return <PaymentBlik />;
  }
  if (method === CONSTANTS.PAYMENT_METHOD.BANK_TRANSFER) {
    return <PaymentBank />;
  }
  return undefined;
}

export function PaymentStep(): JSX.Element {
  const t = useTranslations("checkoutPage.checkoutForm");
  const { control, isPending, onNext } = useCheckoutForm();
  const paymentMethod = useWatch({ control, name: "paymentMethod" });

  const handleContinue = useCallback(
    (e: React.MouseEvent) => {
      void onNext(CHECKOUT_STEP_ID.PAYMENT, e);
    },
    [onNext]
  );

  return (
    <div className="flex flex-col gap-8">
      <CheckoutRadioField control={control} name="paymentMethod">
        <RadioCard value={CONSTANTS.PAYMENT_METHOD.CARD} id="checkout-payment-card" label={t("paymentMethods.card")} icon={cardIcon} />
        <RadioCard value={CONSTANTS.PAYMENT_METHOD.BLIK} id="checkout-payment-blik" label={t("paymentMethods.blik")} icon={blikIcon} />
        <RadioCard
          value={CONSTANTS.PAYMENT_METHOD.BANK_TRANSFER}
          id="checkout-payment-bank_transfer"
          label={t("paymentMethods.bank_transfer")}
          icon={bankIcon}
        />
      </CheckoutRadioField>

      <PaymentSubstep method={paymentMethod} />

      <div className="pt-2">
        <Button
          size="lg"
          disabled={isPending}
          onClick={handleContinue}
          className="group min-h-11 w-full cursor-pointer rounded-none px-8 tracking-[0.2em] uppercase sm:w-auto"
        >
          {t("continueToReview")}
          <ArrowRight aria-hidden className="ml-2 size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.15} />
        </Button>
      </div>
    </div>
  );
}
