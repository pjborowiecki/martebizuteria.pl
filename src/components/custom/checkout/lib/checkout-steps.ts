import type { ComponentType } from "react";

import type { CheckoutFormSchema } from "~/src/components/custom/checkout/lib/checkout.schema";

export const CHECKOUT_STEP_ID = {
  BILLING: "billing",
  DELIVERY: "delivery",
  OVERVIEW: "overview",
  PAYMENT: "payment"
} as const;

export type CheckoutStepId = (typeof CHECKOUT_STEP_ID)[keyof typeof CHECKOUT_STEP_ID];

export interface CheckoutStepConfig {
  readonly component: () => Promise<{ default: ComponentType }>;
  readonly fields: readonly (keyof CheckoutFormSchema)[];
  readonly id: CheckoutStepId;
  readonly titleKey: string;
}

async function loadAddressStep(): Promise<{ default: ComponentType }> {
  const m = await import("~/src/components/custom/checkout/components/steps/address-step");
  return { default: m.AddressStep };
}

async function loadDeliveryStep(): Promise<{ default: ComponentType }> {
  const m = await import("~/src/components/custom/checkout/components/steps/delivery-step");
  return { default: m.DeliveryStep };
}

async function loadPaymentStep(): Promise<{ default: ComponentType }> {
  const m = await import("~/src/components/custom/checkout/components/steps/payment-step");
  return { default: m.PaymentStep };
}

async function loadOverviewStep(): Promise<{ default: ComponentType }> {
  const m = await import("~/src/components/custom/checkout/components/steps/overview-step");
  return { default: m.OverviewStep };
}

export const CHECKOUT_STEPS: readonly CheckoutStepConfig[] = [
  {
    component: loadAddressStep,
    fields: ["firstName", "lastName", "addressLine1", "postCode", "city", "country"],
    id: CHECKOUT_STEP_ID.BILLING,
    titleKey: "steps.billing"
  },
  {
    component: loadDeliveryStep,
    fields: ["deliveryMethod"],
    id: CHECKOUT_STEP_ID.DELIVERY,
    titleKey: "steps.delivery"
  },
  {
    component: loadPaymentStep,
    fields: ["paymentMethod", "cardholderName", "cardNumber", "cardExpiry", "cardCvv"],
    id: CHECKOUT_STEP_ID.PAYMENT,
    titleKey: "steps.payment"
  },
  {
    component: loadOverviewStep,
    fields: [],
    id: CHECKOUT_STEP_ID.OVERVIEW,
    titleKey: "steps.overview"
  }
] as const;
