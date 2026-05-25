"use client";

import { type JSX, useCallback } from "react";

import { ArrowRight, Package, Store, Truck } from "lucide-react";
import { useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";

import { CheckoutRadioField, RadioCard } from "~/src/components/custom/checkout/components/checkout-fields";
import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";
import { DeliveryCourier } from "~/src/components/custom/checkout/components/substeps/delivery-courier";
import { DeliveryInStore } from "~/src/components/custom/checkout/components/substeps/delivery-in-store";
import { DeliveryLocker } from "~/src/components/custom/checkout/components/substeps/delivery-locker";
import { CHECKOUT_STEP_ID } from "~/src/components/custom/checkout/lib/checkout-steps";

const courierIcon = <Truck className="size-6" strokeWidth={1.25} />;
const lockerIcon = <Package className="size-6" strokeWidth={1.25} />;
const inStoreIcon = <Store className="size-6" strokeWidth={1.25} />;

function DeliverySubstep({ method }: Readonly<{ method: string }>): JSX.Element | undefined {
  if (method === CONSTANTS.DELIVERY_METHOD.COURIER) {
    return <DeliveryCourier />;
  }
  if (method === CONSTANTS.DELIVERY_METHOD.LOCKER) {
    return <DeliveryLocker />;
  }
  if (method === CONSTANTS.DELIVERY_METHOD.IN_STORE) {
    return <DeliveryInStore />;
  }
  return undefined;
}

export function DeliveryStep(): JSX.Element {
  const t = useTranslations("checkoutPage.checkoutForm");
  const { control, isPending, onNext } = useCheckoutForm();
  const deliveryMethod = useWatch({ control, name: "deliveryMethod" });

  const handleContinue = useCallback(
    (e: React.MouseEvent) => {
      void onNext(CHECKOUT_STEP_ID.DELIVERY, e);
    },
    [onNext]
  );

  return (
    <div className="flex flex-col gap-8">
      <CheckoutRadioField control={control} name="deliveryMethod">
        <RadioCard
          value={CONSTANTS.DELIVERY_METHOD.COURIER}
          id="checkout-delivery-courier"
          label={t("deliveryMethods.courier")}
          icon={courierIcon}
        />
        <RadioCard
          value={CONSTANTS.DELIVERY_METHOD.LOCKER}
          id="checkout-delivery-locker"
          label={t("deliveryMethods.locker")}
          icon={lockerIcon}
        />
        <RadioCard
          value={CONSTANTS.DELIVERY_METHOD.IN_STORE}
          id="checkout-delivery-in_store"
          label={t("deliveryMethods.in_store")}
          icon={inStoreIcon}
        />
      </CheckoutRadioField>

      <DeliverySubstep method={deliveryMethod} />

      <div className="pt-2">
        <Button
          size="lg"
          disabled={isPending}
          onClick={handleContinue}
          className="group min-h-11 w-full cursor-pointer rounded-none px-8 tracking-[0.2em] uppercase sm:w-auto"
        >
          {t("continueToPayment")}
          <ArrowRight aria-hidden className="ml-2 size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.15} />
        </Button>
      </div>
    </div>
  );
}
