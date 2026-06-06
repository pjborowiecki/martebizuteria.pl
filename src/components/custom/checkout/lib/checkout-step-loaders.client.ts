import "@tanstack/react-start/client-only";
import type { ComponentType } from "react";

import {
  CHECKOUT_STEP_DEFINITIONS,
  CHECKOUT_STEP_ID,
  type CheckoutStepDefinition,
  type CheckoutStepId
} from "~/src/components/custom/checkout/lib/checkout-steps";

export interface CheckoutStepConfig extends CheckoutStepDefinition {
  readonly component: () => Promise<{ default: ComponentType }>;
}

async function loadContactStep(): Promise<{ default: ComponentType }> {
  const m = await import("~/src/components/custom/checkout/components/_steps/contact-step");
  return { default: m.ContactStep };
}

async function loadAddressStep(): Promise<{ default: ComponentType }> {
  const m = await import("~/src/components/custom/checkout/components/_steps/address-step");
  return { default: m.AddressStep };
}

async function loadDeliveryStep(): Promise<{ default: ComponentType }> {
  const m = await import("~/src/components/custom/checkout/components/_steps/delivery-step");
  return { default: m.DeliveryStep };
}

async function loadPaymentStep(): Promise<{ default: ComponentType }> {
  const m = await import("~/src/components/custom/checkout/components/_steps/payment-step.client");
  return { default: m.PaymentStep };
}

const STEP_LOADERS: Record<CheckoutStepId, () => Promise<{ default: ComponentType }>> = {
  [CHECKOUT_STEP_ID.BILLING]: loadAddressStep,
  [CHECKOUT_STEP_ID.CONTACT]: loadContactStep,
  [CHECKOUT_STEP_ID.DELIVERY]: loadDeliveryStep,
  [CHECKOUT_STEP_ID.PAYMENT]: loadPaymentStep
};

export const CHECKOUT_STEPS: readonly CheckoutStepConfig[] = CHECKOUT_STEP_DEFINITIONS.map((definition) => ({
  component: STEP_LOADERS[definition.id],
  fields: definition.fields,
  id: definition.id,
  titleKey: definition.titleKey
}));
