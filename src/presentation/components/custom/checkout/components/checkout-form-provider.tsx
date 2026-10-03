import {
  type BaseSyntheticEvent,
  type JSX,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate, useSearch } from "@tanstack/react-router"
import {
  type Control,
  type UseFormGetValues,
  type UseFormReturn,
  type UseFormSetValue,
  type UseFormTrigger,
  useForm,
} from "react-hook-form"

import { type CheckoutSession } from "~/src/integrations/stripe/stripe.checkout"

import { type CheckoutFormSchema, checkoutSchema } from "~/src/modules/checkout/checkout.zod"

import { loadCheckoutDraft, saveCheckoutDraft } from "~/src/presentation/components/custom/checkout/lib/checkout-draft"
import {
  CHECKOUT_STEP_DEFINITIONS,
  type CheckoutStepId,
  getFurthestReachableStepIndex,
} from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

export interface CheckoutFormContextValue {
  activeStepIndex: number
  control: Control<CheckoutFormSchema>
  getValues: UseFormGetValues<CheckoutFormSchema>
  isFormValid: boolean
  checkoutSession: CheckoutSession | undefined
  isPending: boolean
  onEdit: (stepId: CheckoutStepId) => void
  onNext: (stepId: CheckoutStepId, event?: BaseSyntheticEvent) => Promise<void>
  setCheckoutSession: (session: CheckoutSession) => void
  setValue: UseFormSetValue<CheckoutFormSchema>
  trigger: UseFormTrigger<CheckoutFormSchema>
}

const CheckoutFormContext = createContext<CheckoutFormContextValue | undefined>(undefined)

const STEP_NOT_FOUND = -1

const LAST_STEP_INDEX = CHECKOUT_STEP_DEFINITIONS.length - 1

const stepParamToIndex = (param: number): number => param - 1

const stepIndexToParam = (index: number): number => index + 1

const useCheckoutNavigation = (form: UseFormReturn<CheckoutFormSchema>) => {
  const { getValues, trigger } = form
  const search = useSearch({ from: "/checkout" })
  const navigate = useNavigate()
  const [isPending, startTransition] = useTransition()

  const currentParam = (search as { step?: number }).step ?? 1
  const requestedIndex = Math.max(0, Math.min(stepParamToIndex(currentParam), LAST_STEP_INDEX))

  const activeStepIndex = Math.min(requestedIndex, getFurthestReachableStepIndex(getValues()))

  const onNext = useCallback(
    async (stepId: CheckoutStepId, event?: BaseSyntheticEvent) => {
      if (event !== undefined) {
        event.preventDefault()
      }

      const currentStepIndex = CHECKOUT_STEP_DEFINITIONS.findIndex((definition) => definition.id === stepId)
      const config = CHECKOUT_STEP_DEFINITIONS[currentStepIndex]
      if (config === undefined) {
        return
      }

      const isValid = await trigger([...config.fields], { shouldFocus: true })

      if (isValid) {
        startTransition(() => {
          void navigate({
            search: { step: stepIndexToParam(currentStepIndex + 1) },
            to: ".",
          })
        })
      }
    },
    [trigger, navigate],
  )

  const onEdit = useCallback(
    (stepId: CheckoutStepId) => {
      const targetStepIndex = CHECKOUT_STEP_DEFINITIONS.findIndex((definition) => definition.id === stepId)
      if (targetStepIndex === STEP_NOT_FOUND) {
        return
      }

      startTransition(() => {
        void navigate({
          search: { step: stepIndexToParam(targetStepIndex) },
          to: ".",
        })
      })
    },
    [navigate],
  )

  return { activeStepIndex, isPending, onEdit, onNext }
}

const useCheckoutDraftPersistence = ({ watch }: UseFormReturn<CheckoutFormSchema>): void => {
  useEffect(() => {
    const subscription = watch((values) => {
      saveCheckoutDraft(values)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [watch])
}

export const CheckoutFormProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const [draftValues] = useState(loadCheckoutDraft)
  const form = useForm<CheckoutFormSchema>({
    defaultValues: { ...EMPTY_CHECKOUT_VALUES, ...draftValues },
    mode: "onTouched",
    resolver: zodResolver(checkoutSchema),
  })

  useCheckoutDraftPersistence(form)

  const {
    control,
    formState: { isValid: isFormValid },
    getValues,
    setValue,
    trigger,
  } = form

  const { activeStepIndex, isPending, onEdit, onNext } = useCheckoutNavigation(form)
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession>()

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
      trigger,
    }),
    [activeStepIndex, checkoutSession, control, getValues, isFormValid, isPending, onEdit, onNext, setValue, trigger],
  )

  return (
    <CheckoutFormContext.Provider value={value}>
      <div className="flex flex-col gap-2 lg:gap-4">{children}</div>
    </CheckoutFormContext.Provider>
  )
}

const EMPTY_CHECKOUT_VALUES: CheckoutFormSchema = {
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
  storeLocation: "",
}

export const useCheckoutForm = (): CheckoutFormContextValue => {
  const context = useContext(CheckoutFormContext)
  if (context === undefined) {
    throw new Error("useCheckoutForm must be used within CheckoutFormProvider")
  }

  return context
}
