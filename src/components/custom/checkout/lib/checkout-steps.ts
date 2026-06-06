import { type CheckoutFormSchema, checkoutSchema } from "~/src/modules/checkout/checkout.zod";

const STEP_NOT_FOUND = -1;
const LAST_STEP_OFFSET = 1;
const FIRST_PATH_SEGMENT = 0;

export const CHECKOUT_STEP_ID = {
  BILLING: "billing",
  CONTACT: "contact",
  DELIVERY: "delivery",
  PAYMENT: "payment"
} as const;

export type CheckoutStepId = (typeof CHECKOUT_STEP_ID)[keyof typeof CHECKOUT_STEP_ID];

export interface CheckoutStepDefinition {
  readonly fields: readonly (keyof CheckoutFormSchema)[];
  readonly id: CheckoutStepId;
  readonly titleKey: string;
}

export const CHECKOUT_STEP_DEFINITIONS: readonly CheckoutStepDefinition[] = [
  {
    fields: ["email", "phone"],
    id: CHECKOUT_STEP_ID.CONTACT,
    titleKey: "steps.contact"
  },
  {
    fields: [
      "firstName",
      "lastName",
      "address1",
      "postalCode",
      "city",
      "countryCode",
      "sameAsShipping",
      "billingFirstName",
      "billingLastName",
      "billingAddress1",
      "billingPostalCode",
      "billingCity",
      "billingCountryCode"
    ],
    id: CHECKOUT_STEP_ID.BILLING,
    titleKey: "steps.billing"
  },
  {
    fields: ["deliveryMethod", "lockerId"],
    id: CHECKOUT_STEP_ID.DELIVERY,
    titleKey: "steps.delivery"
  },
  {
    fields: [],
    id: CHECKOUT_STEP_ID.PAYMENT,
    titleKey: "steps.payment"
  }
] as const;

/**
 * The single source of truth for step access: a shopper may open any step they
 * have already completed, plus the first step that is still incomplete — never
 * one beyond it. Completeness is derived from the same zod schema that validates
 * the form (so the guard can never drift from the real rules, including the
 * billing/locker `superRefine` branches): a step is incomplete when any of its
 * fields appears in the schema's validation issues.
 *
 * Returns the index of the furthest step the shopper is allowed to open. This
 * lets the form clamp `?step=N` so deep links (e.g. jumping straight to payment)
 * can't bypass the contact/address/delivery steps.
 */
export function getFurthestReachableStepIndex(values: CheckoutFormSchema): number {
  const result = checkoutSchema.safeParse(values);
  if (result.success) {
    return CHECKOUT_STEP_DEFINITIONS.length - LAST_STEP_OFFSET;
  }

  const invalidFields = new Set(
    result.error.issues.map((issue) => issue.path[FIRST_PATH_SEGMENT]).filter((path): path is string => typeof path === "string")
  );

  const firstIncompleteIndex = CHECKOUT_STEP_DEFINITIONS.findIndex((step) => step.fields.some((field) => invalidFields.has(field)));
  return firstIncompleteIndex === STEP_NOT_FOUND ? CHECKOUT_STEP_DEFINITIONS.length - LAST_STEP_OFFSET : firstIncompleteIndex;
}
