"use client";

import type { JSX } from "react";

import { ArrowRight, CreditCard } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";

import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";

const LAST_FOUR_DIGITS = -4;
const EMPTY_LENGTH = 0;

export function OverviewStep(): JSX.Element {
  const t = useTranslations("checkoutPage.checkoutForm");
  const { getValues, isFormValid, isPending } = useCheckoutForm();
  const values = getValues();

  const isCard = values.paymentMethod === CONSTANTS.PAYMENT_METHOD.CARD;
  const cardEndingDigits = isCard ? (values.cardNumber?.replaceAll(/\s/gu, "").slice(LAST_FOUR_DIGITS) ?? "") : "";
  const hasCardDigits = cardEndingDigits.length > EMPTY_LENGTH;

  return (
    <div className="flex flex-col">
      <div className="mb-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 md:mb-8">
        <div className="space-y-1">
          <h3 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">{t("shippingTo")}</h3>
          <div className="space-y-1">
            <p className="text-base leading-relaxed text-foreground">
              {values.firstName} {values.lastName}
            </p>
            <p className="text-base leading-relaxed text-foreground">{values.addressLine1}</p>
            <p className="text-base leading-relaxed text-foreground">
              {values.postCode} {values.city}
            </p>
            <p className="text-base leading-relaxed text-foreground">{values.country}</p>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">{t("deliveryMethod")}</h3>
          <div className="space-y-1">
            <p className="text-base leading-relaxed font-medium text-foreground italic">{t(`deliveryMethods.${values.deliveryMethod}`)}</p>
            <p className="text-sm text-muted-foreground">{t("estDeliveryPlaceholder")}</p>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">{t("paymentInformation")}</h3>
          <div className="flex items-center gap-2">
            {hasCardDigits ? <CreditCard aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.15} /> : undefined}
            <p className="text-base leading-relaxed text-foreground">
              {hasCardDigits ? t("cardSummary", { endingDigits: cardEndingDigits }) : t(`paymentMethods.${values.paymentMethod}`)}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">{t("billingAddress")}</h3>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground italic">{t("sameAsShipping")}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-8">
        <Button
          size="lg"
          type="submit"
          disabled={isPending || !isFormValid}
          className="group min-h-13 w-full rounded-none text-sm tracking-[0.2em] uppercase disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          {t("placeOrder")}
          <ArrowRight aria-hidden className="ml-2 size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.15} />
        </Button>
        <p className="mt-5 text-center text-xs text-muted-foreground/70 italic">{t("termsAgreement")}</p>
      </div>
    </div>
  );
}
