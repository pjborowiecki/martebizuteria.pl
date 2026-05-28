import {
  type BaseSyntheticEvent,
  createContext,
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition
} from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  type Control,
  type UseFormGetValues,
  type UseFormReturn,
  type UseFormSetValue,
  type UseFormTrigger,
  useForm
} from "react-hook-form";

import type { CheckoutSession } from "~/src/integrations/stripe/stripe.checkout";

import { loadCheckoutDraft, saveCheckoutDraft } from "~/src/components/custom/checkout/lib/checkout-draft";
import { CHECKOUT_STEPS, type CheckoutStepId, getFurthestReachableStepIndex } from "~/src/components/custom/checkout/lib/checkout-steps";

import { type CheckoutFormSchema, checkoutSchema } from "~/src/modules/checkout/checkout.zod";

export interface CheckoutFormContextValue {
  activeStepIndex: number;
  control: Control<CheckoutFormSchema>;
  getValues: UseFormGetValues<CheckoutFormSchema>;
  isFormValid: boolean;
  checkoutSession: CheckoutSession | undefined;
  isPending: boolean;
  onEdit: (stepId: CheckoutStepId) => void;
  onNext: (stepId: CheckoutStepId, e?: BaseSyntheticEvent) => Promise<void>;
  setCheckoutSession: (session: CheckoutSession) => void;
  setValue: UseFormSetValue<CheckoutFormSchema>;
  trigger: UseFormTrigger<CheckoutFormSchema>;
}

const CheckoutFormContext = createContext<CheckoutFormContextValue | undefined>(undefined);

const STEP_NOT_FOUND = -1;
const FIRST_STEP_INDEX = 0;
const LAST_STEP_OFFSET = 1;
const NEXT_STEP = 1;
// The `?step=` URL param is 1-based (human-friendly); internal indices are 0-based.
const STEP_PARAM_BASE = 1;
const LAST_STEP_INDEX = CHECKOUT_STEPS.length - LAST_STEP_OFFSET;

const stepParamToIndex = (param: number): number => param - STEP_PARAM_BASE;
const stepIndexToParam = (index: number): number => index + STEP_PARAM_BASE;

function useCheckoutNavigation(form: UseFormReturn<CheckoutFormSchema>, hydrated: boolean) {
  const { getValues, trigger } = form;
  const search = useSearch({ from: "/{-$locale}/checkout" });
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  const currentParam = (search as { step?: number }).step ?? STEP_PARAM_BASE;
  const requestedIndex = Math.max(FIRST_STEP_INDEX, Math.min(stepParamToIndex(currentParam), LAST_STEP_INDEX));

  const reachableIndex = getFurthestReachableStepIndex(getValues());
  const activeStepIndex = hydrated ? Math.min(requestedIndex, reachableIndex) : requestedIndex;

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
            search: { step: stepIndexToParam(currentStepIndex + NEXT_STEP) },
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
          search: { step: stepIndexToParam(targetStepIndex) },
          to: "."
        });
      });
    },
    [navigate]
  );

  return { activeStepIndex, isPending, onEdit, onNext };
}

function useCheckoutDraftPersistence(form: UseFormReturn<CheckoutFormSchema>): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const draft = loadCheckoutDraft();
    if (draft !== undefined) {
      form.reset({ ...form.getValues(), ...draft }, { keepDefaultValues: true });
    }

    setHydrated(true);

    const subscription = form.watch((values) => {
      saveCheckoutDraft(values);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [form]);

  return hydrated;
}

export function CheckoutFormProvider({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const form = useForm<CheckoutFormSchema>({
    defaultValues: {
      address1: "",
      billingAddress1: "",
      billingCity: "",
      billingCountryCode: "PL",
      billingFirstName: "",
      billingLastName: "",
      billingPostalCode: "",
      city: "",
      countryCode: "PL",
      deliveryMethod: "",
      deliveryMethodType: "",
      email: "",
      firstName: "",
      lastName: "",
      lockerCity: "",
      lockerId: "",
      phone: "",
      postalCode: "",
      province: "",
      sameAsShipping: true,
      storeLocation: ""
    },
    mode: "onTouched",
    resolver: zodResolver(checkoutSchema)
  });

  const hydrated = useCheckoutDraftPersistence(form);

  const {
    control,
    formState: { isValid: isFormValid },
    getValues,
    setValue,
    trigger
  } = form;

  const { activeStepIndex, isPending, onEdit, onNext } = useCheckoutNavigation(form, hydrated);
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession>();

  const value = useMemo(
    () => ({
      activeStepIndex,
      checkoutSession,
      control,
      getValues,
      isFormValid,
      isPending,
      onEdit,
      onNext,
      setCheckoutSession,
      setValue,
      trigger
    }),
    [activeStepIndex, checkoutSession, control, getValues, isFormValid, isPending, onEdit, onNext, setValue, trigger]
  );

  return (
    <CheckoutFormContext.Provider value={value}>
      {/*
        Intentionally a <div>, not a <form>: each step advances via button
        onClick (onNext), and the payment step renders its own <form> for Stripe.
        A wrapping <form> here would nest forms (invalid HTML + hydration error).
      */}
      <div className="flex flex-col gap-2 lg:gap-4">{children}</div>
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
