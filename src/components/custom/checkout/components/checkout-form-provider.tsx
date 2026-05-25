"use client";

import { type BaseSyntheticEvent, createContext, type JSX, type ReactNode, useCallback, useContext, useMemo, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { type Control, type UseFormGetValues, useForm } from "react-hook-form";

import { CONSTANTS } from "~/src/constants";

import { CHECKOUT_STEPS, type CheckoutStepId } from "~/src/components/custom/checkout/lib/checkout-steps";
import { type CheckoutFormSchema, checkoutSchema } from "~/src/components/custom/checkout/lib/checkout.schema";

export interface CheckoutFormContextValue {
  activeStepIndex: number;
  control: Control<CheckoutFormSchema>;
  getValues: UseFormGetValues<CheckoutFormSchema>;
  isFormValid: boolean;
  isPending: boolean;
  onEdit: (stepId: CheckoutStepId) => void;
  onNext: (stepId: CheckoutStepId, e?: BaseSyntheticEvent) => Promise<void>;
}

const CheckoutFormContext = createContext<CheckoutFormContextValue | undefined>(undefined);

const STEP_NOT_FOUND = -1;
const NEXT_STEP_OFFSET = 1;
const LAST_STEP_OFFSET = 1;
const FIRST_STEP = 1;
const MIN_STEP_INDEX = 0;

export function CheckoutFormProvider({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const search = useSearch({ from: "/{-$locale}/checkout" });
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CheckoutFormSchema>({
    defaultValues: {
      addressLine1: "",
      cardCvv: "",
      cardExpiry: "",
      cardNumber: "",
      cardholderName: "",
      city: "",
      country: "PL",
      deliveryMethod: CONSTANTS.DEFAULT_DELIVERY_METHOD,
      firstName: "",
      lastName: "",
      paymentMethod: CONSTANTS.DEFAULT_PAYMENT_METHOD,
      postCode: "",
      saveCard: false
    },
    mode: "onTouched",
    resolver: zodResolver(checkoutSchema)
  });

  const {
    control,
    formState: { isValid: isFormValid },
    getValues,
    trigger
  } = form;

  const currentStep = (search as { step?: number }).step ?? FIRST_STEP;
  const activeStepIndex = Math.max(MIN_STEP_INDEX, Math.min(currentStep - NEXT_STEP_OFFSET, CHECKOUT_STEPS.length - LAST_STEP_OFFSET));

  const onNext = useCallback(
    async (stepId: CheckoutStepId, e?: BaseSyntheticEvent) => {
      if (e !== undefined) {
        e.preventDefault();
      }

      const currentStepIndex = CHECKOUT_STEPS.findIndex((s) => s.id === stepId);
      if (currentStepIndex === STEP_NOT_FOUND) {
        return;
      }

      const config = CHECKOUT_STEPS[currentStepIndex];
      if (config === undefined) {
        return;
      }

      const isValid = await trigger([...config.fields], { shouldFocus: true });

      if (isValid) {
        startTransition(() => {
          void navigate({
            search: { step: currentStepIndex + NEXT_STEP_OFFSET + NEXT_STEP_OFFSET },
            to: "."
          });
        });
      }
    },
    [trigger, navigate]
  );

  const onEdit = useCallback(
    (stepId: CheckoutStepId) => {
      const targetStepIndex = CHECKOUT_STEPS.findIndex((s) => s.id === stepId);
      if (targetStepIndex === STEP_NOT_FOUND) {
        return;
      }

      startTransition(() => {
        void navigate({
          search: { step: targetStepIndex + NEXT_STEP_OFFSET },
          to: "."
        });
      });
    },
    [navigate]
  );

  const onSubmit = useCallback(
    (values: CheckoutFormSchema) => {
      if (activeStepIndex !== CHECKOUT_STEPS.length - LAST_STEP_OFFSET) {
        return;
      }

      startTransition(() => {
        console.info("Submitting valid order state:", values);
        void navigate({ search: {}, to: "." });
      });
    },
    [activeStepIndex, navigate]
  );

  const handleFormSubmit = useCallback(
    (e: BaseSyntheticEvent) => {
      void form.handleSubmit(onSubmit)(e);
    },
    [form, onSubmit]
  );

  const value = useMemo(
    () => ({ activeStepIndex, control, getValues, isFormValid, isPending, onEdit, onNext }),
    [activeStepIndex, control, getValues, isFormValid, isPending, onEdit, onNext]
  );

  return (
    <CheckoutFormContext.Provider value={value}>
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-2 lg:gap-4">
        {children}
      </form>
    </CheckoutFormContext.Provider>
  );
}

export function useCheckoutForm(): CheckoutFormContextValue {
  const context = useContext(CheckoutFormContext);
  if (context === undefined) {
    throw new Error("useCheckoutForm must be used within CheckoutFormProvider");
  }
  return context;
}
