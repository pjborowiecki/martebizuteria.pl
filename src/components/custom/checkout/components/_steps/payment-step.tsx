import { type BaseSyntheticEvent, type JSX, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import type { StripeCheckoutElementsSdkOptions, StripeCheckoutPaymentElementOptions } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "@wrksz/themes/client";
import { AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { getStripeAppearance } from "~/src/integrations/stripe/stripe.appearance";
import { confirmCheckoutSession, ensureCheckoutSession, resetCheckoutSession } from "~/src/integrations/stripe/stripe.checkout";
import { getStripe } from "~/src/integrations/stripe/stripe.client";
import { getCheckoutErrorKey } from "~/src/integrations/stripe/stripe.errors";

import { cn } from "~/src/lib/utils";

import { Button, buttonVariants } from "~/src/components/shadcn/button";
import { Skeleton } from "~/src/components/shadcn/skeleton";

import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";
import { CHECKOUT_STEP_ID } from "~/src/components/custom/checkout/lib/checkout-steps";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import type { CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod";
import { deliveryMethodQueries } from "~/src/modules/delivery-method/delivery-method.queries";
import { useCartStore } from "~/src/stores/cart.store";

const NO_COST = 0;
const RETRY_START = 0;
const RETRY_STEP = 1;

const FONT_CSS_SRC = "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600&display=swap";

const PAYMENT_ELEMENT_OPTIONS: StripeCheckoutPaymentElementOptions = {
  fields: { billingDetails: "never" },
  layout: {
    radios: "always",
    spacedAccordionItems: true,
    type: "accordion"
  },
  paymentMethodOrder: [...CONSTANTS.CHECKOUT_PAYMENT_METHOD_ORDER],
  wallets: { applePay: "never", googlePay: "never", link: "never" }
};

const renderTermsLink = (chunks: ReactNode): JSX.Element => (
  <LocalizedLink to={CONSTANTS.ROUTES.TERMS_OF_SERVICE} className="underline underline-offset-4 hover:text-foreground">
    {chunks}
  </LocalizedLink>
);

const renderPrivacyLink = (chunks: ReactNode): JSX.Element => (
  <LocalizedLink to={CONSTANTS.ROUTES.PRIVACY_POLICY} className="underline underline-offset-4 hover:text-foreground">
    {chunks}
  </LocalizedLink>
);

function isCheckoutComplete(values: CheckoutFormSchema): boolean {
  return Boolean(
    values.email &&
    values.phone &&
    values.firstName &&
    values.lastName &&
    values.address1 &&
    values.city &&
    values.postalCode &&
    values.deliveryMethod
  );
}

function PaymentSkeleton(): JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full rounded-none" />
      <Skeleton className="h-12 w-full rounded-none" />
      <Skeleton className="h-12 w-2/3 rounded-none" />
    </div>
  );
}

function PaymentError({ onRetry }: Readonly<{ onRetry: () => void }>): JSX.Element {
  const t = useTranslations("pages.checkout.checkoutForm");

  return (
    <div className="flex flex-col items-center gap-4 border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertCircle aria-hidden className="size-7 text-destructive" strokeWidth={1.3} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">{t("paymentUnavailable")}</p>
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">{t("paymentUnavailableHint")}</p>
      </div>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onRetry} className="cursor-pointer rounded-none text-xs tracking-[0.15em] uppercase">
          {t("retry")}
        </Button>
        <LocalizedLink
          to={CONSTANTS.ROUTES.CART}
          className={cn(buttonVariants({ variant: "outline" }), "rounded-none text-xs tracking-[0.15em] uppercase")}
        >
          {t("backToCart")}
        </LocalizedLink>
      </div>
    </div>
  );
}

function PaymentForm({ onReset, onRetry }: Readonly<{ onReset: () => Promise<void>; onRetry: () => void }>): JSX.Element {
  const t = useTranslations("pages.checkout.checkoutForm");
  const navigate = useNavigate();

  const { getValues } = useCheckoutForm();
  const checkoutState = useCheckoutElements();

  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleReady = useCallback(() => {
    setIsReady(true);
  }, []);

  const checkout = checkoutState.type === "success" ? checkoutState.checkout : undefined;

  const handlePay = useCallback(async () => {
    if (checkout === undefined) {
      return;
    }

    setIsProcessing(true);
    try {
      const outcome = await confirmCheckoutSession({
        checkout,
        values: getValues()
      });

      if (outcome.status === "error") {
        // A stale session (e.g. an abandoned BLIK push left the PaymentIntent
        // stuck in `requires_action`) can never be confirmed again. Instead of
        // a dead-end toast, transparently rebuild the session — the Elements
        // provider remounts on the new client secret — and tell the shopper to
        // pick a method and retry. Plain declines stay on the same session.
        if (outcome.recoverable) {
          await onReset();
          toast.error(t("errors.paymentSessionStale"));
        } else {
          toast.error(outcome.message === "" ? t("validation.paymentFailed") : outcome.message);
        }
        return;
      }

      // Non-redirect methods (card) resolve here; redirect methods (BLIK,
      // Przelewy24) navigate away and return to `?success=true`. We must NOT
      // clear the cart before navigating — an empty cart trips CheckoutGuard,
      // which would bounce the shopper back to /cart. The success screen
      // (CheckoutSuccess) owns clearing the cart + draft once it mounts.
      await navigate({ search: (prev) => ({ ...prev, success: true }), to: "." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("validation.paymentFailed"));
    } finally {
      setIsProcessing(false);
    }
  }, [checkout, getValues, navigate, onReset, t]);

  const onFormSubmit = useCallback(
    (e: BaseSyntheticEvent) => {
      e.preventDefault();
      void handlePay();
    },
    [handlePay]
  );

  if (checkoutState.type === "error") {
    return <PaymentError onRetry={onRetry} />;
  }

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col gap-6">
      {!isReady && <PaymentSkeleton />}

      <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} onReady={handleReady} />

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          type="submit"
          disabled={!isReady || isProcessing || checkout === undefined}
          className="group min-h-13 w-full cursor-pointer rounded-none text-sm tracking-[0.2em] uppercase disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          {isProcessing ? t("processingPayment") : t("placeOrder")}
          <ArrowRight aria-hidden className="ml-2 size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.15} />
        </Button>
        <p className="text-center text-xs text-muted-foreground/70 italic">
          {t.rich("termsAgreement", { privacy: renderPrivacyLink, terms: renderTermsLink })}
        </p>
      </div>
    </form>
  );
}

interface CheckoutSessionLoader {
  isLoading: boolean;
  loadError: boolean;
  options: StripeCheckoutElementsSdkOptions | undefined;
  resetSession: () => Promise<void>;
  retry: () => void;
  sessionId: string | undefined;
}

function useCheckoutSessionLoader(): CheckoutSessionLoader {
  const t = useTranslations("pages.checkout.checkoutForm");
  const { theme } = useTheme();
  const { checkoutSession, getValues, onEdit, setCheckoutSession } = useCheckoutForm();

  const cartTotal = useCartStore((state) => state.cartTotal);
  const items = useCartStore((state) => state.items);
  const deliveryMethodId = getValues("deliveryMethod");

  const [loadError, setLoadError] = useState(false);
  const [retryToken, setRetryToken] = useState(RETRY_START);

  const { data: deliveryMethods, isLoading } = useQuery(deliveryMethodQueries.deliveryMethodsQueryOptions());

  const deliveryCost = deliveryMethods?.find((m) => m.id === deliveryMethodId)?.price ?? NO_COST;
  const amountCents = cartTotal() + deliveryCost;
  const inFlightRef = useRef(false);

  const retry = useCallback(() => {
    setLoadError(false);
    setRetryToken((token) => token + RETRY_STEP);
  }, []);

  // Swap the stranded session for a fresh one (new PaymentIntent + client
  // secret), expiring the old session server-side. Changing the client secret
  // remounts the Stripe provider, giving the shopper a clean Payment Element.
  const resetSession = useCallback(async () => {
    if (checkoutSession === undefined || inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    try {
      const session = await resetCheckoutSession({
        amount: amountCents,
        items,
        session: checkoutSession,
        values: getValues()
      });
      setCheckoutSession(session);
    } catch (error) {
      setLoadError(true);
      toast.error(t(getCheckoutErrorKey(error)));
    } finally {
      inFlightRef.current = false;
    }
  }, [amountCents, checkoutSession, getValues, items, setCheckoutSession, t]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isCheckoutComplete(getValues())) {
      onEdit(CHECKOUT_STEP_ID.CONTACT);
      return;
    }

    if (amountCents <= NO_COST || inFlightRef.current || checkoutSession?.amount === amountCents) {
      return;
    }

    const run = async () => {
      inFlightRef.current = true;
      setLoadError(false);
      try {
        const session = await ensureCheckoutSession({
          amount: amountCents,
          existing: checkoutSession,
          items,
          values: getValues()
        });
        setCheckoutSession(session);
      } catch (error) {
        setLoadError(true);
        toast.error(t(getCheckoutErrorKey(error)));
      } finally {
        inFlightRef.current = false;
      }
    };

    void run();
  }, [amountCents, isLoading, checkoutSession, items, getValues, onEdit, setCheckoutSession, t, retryToken]);

  const options = useMemo<StripeCheckoutElementsSdkOptions | undefined>(() => {
    if (checkoutSession === undefined) {
      return;
    }
    return {
      clientSecret: checkoutSession.clientSecret,
      elementsOptions: {
        appearance: getStripeAppearance(theme === "dark" ? "dark" : "light"),
        fonts: [{ cssSrc: FONT_CSS_SRC }]
      }
    };
  }, [checkoutSession, theme]);

  return { isLoading, loadError, options, resetSession, retry, sessionId: checkoutSession?.sessionId };
}

export function PaymentStep(): JSX.Element {
  const locale = useLocale();
  const t = useTranslations("pages.checkout.checkoutForm");

  const stripePromise = useMemo(() => getStripe(locale), [locale]);
  const { isLoading, loadError, options, resetSession, retry, sessionId } = useCheckoutSessionLoader();

  if (loadError && options === undefined) {
    return <PaymentError onRetry={retry} />;
  }

  if (isLoading || options === undefined) {
    return <PaymentSkeleton />;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{t("paymentMethodsIntro")}</p>
      <div className="mt-4">
        {/* Keyed on the client secret so rebuilding the session (after an
            abandoned async attempt) cleanly remounts the Stripe provider. */}
        <CheckoutElementsProvider key={sessionId} stripe={stripePromise} options={options}>
          <PaymentForm onReset={resetSession} onRetry={retry} />
        </CheckoutElementsProvider>
      </div>
    </div>
  );
}
