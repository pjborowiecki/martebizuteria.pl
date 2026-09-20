import { type ComponentType, type LazyExoticComponent, lazy } from "react"

import "@tanstack/react-start/client-only"

import {
  CHECKOUT_STEP_DEFINITIONS,
  CHECKOUT_STEP_ID,
  type CheckoutStepDefinition,
  type CheckoutStepId,
} from "~/src/presentation/components/custom/checkout/lib/checkout-steps"
const loadContactStep = async (): Promise<{
  default: ComponentType
}> => {
  const m = await import("~/src/presentation/components/custom/checkout/components/_steps/contact-step")
  return {
    default: m.ContactStep,
  }
}
const loadAddressStep = async (): Promise<{
  default: ComponentType
}> => {
  const m = await import("~/src/presentation/components/custom/checkout/components/_steps/address-step")
  return {
    default: m.AddressStep,
  }
}
const loadDeliveryStep = async (): Promise<{
  default: ComponentType
}> => {
  const m = await import("~/src/presentation/components/custom/checkout/components/_steps/delivery-step")
  return {
    default: m.DeliveryStep,
  }
}
const loadPaymentStep = async (): Promise<{
  default: ComponentType
}> => {
  const m = await import("~/src/presentation/components/custom/checkout/components/_steps/payment-step.client")
  return {
    default: m.PaymentStep,
  }
}
export interface CheckoutStepConfig extends CheckoutStepDefinition {
  readonly component: LazyExoticComponent<ComponentType>
}
const STEP_LOADERS: Record<
  CheckoutStepId,
  () => Promise<{
    default: ComponentType
  }>
> = {
  [CHECKOUT_STEP_ID.BILLING]: loadAddressStep,
  [CHECKOUT_STEP_ID.CONTACT]: loadContactStep,
  [CHECKOUT_STEP_ID.DELIVERY]: loadDeliveryStep,
  [CHECKOUT_STEP_ID.PAYMENT]: loadPaymentStep,
}
export const CHECKOUT_STEPS: readonly CheckoutStepConfig[] = CHECKOUT_STEP_DEFINITIONS.map((definition) => ({
  component: lazy(STEP_LOADERS[definition.id]),
  fields: definition.fields,
  id: definition.id,
  titleKey: definition.titleKey,
}))
