import { type JSX, type MouseEvent, useCallback, useEffect } from "react";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { useSession } from "~/src/integrations/better-auth/auth._client";

import { Button } from "~/src/components/shadcn/button";
import { FieldGroup } from "~/src/components/shadcn/field";

import { CheckoutPhoneField, CheckoutTextField } from "~/src/components/custom/checkout/components/checkout-fields";
import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";
import { CHECKOUT_STEP_ID } from "~/src/components/custom/checkout/lib/checkout-steps";

export function ContactStep(): JSX.Element {
  const t = useTranslations("pages.checkout.checkoutForm");

  const { control, getValues, isPending, onNext, setValue } = useCheckoutForm();
  const { data: session } = useSession();

  useEffect(() => {
    const sessionEmail = session?.user?.email;
    if (getValues("email") === "" && typeof sessionEmail === "string" && sessionEmail !== "") {
      setValue("email", sessionEmail);
    }
  }, [session, getValues, setValue]);

  const handleContinue = useCallback(
    (e: MouseEvent) => {
      void onNext(CHECKOUT_STEP_ID.CONTACT, e);
    },
    [onNext]
  );

  return (
    <div className="flex flex-col gap-6">
      <FieldGroup className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <CheckoutTextField control={control} name="email" type="email" autoComplete="email" label={t("email")} required />
        <CheckoutPhoneField control={control} name="phone" label={t("phone")} required />
      </FieldGroup>

      <div>
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={isPending}
          className="group min-h-11 w-full cursor-pointer rounded-none px-8 tracking-[0.2em] uppercase sm:w-auto"
        >
          {t("continueToAddress")}
          <ArrowRight aria-hidden className="ml-2 size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.15} />
        </Button>
      </div>
    </div>
  );
}
