import { type CheckoutFormSchema, checkoutSchema } from "~/src/modules/checkout/checkout.zod"
/** Allow completed steps and the first incomplete step, using the form schema, including cross-field rules. */
export const getFurthestReachableStepIndex = (values: CheckoutFormSchema): number => {
  const result = checkoutSchema.safeParse(values)
  if (result.success) {
    return CHECKOUT_STEP_DEFINITIONS.length - 1
  }
  const invalidFields = new Set(
    result.error.issues.map((issue) => issue.path[0]).filter((path): path is string => typeof path === "string"),
  )
  const firstIncompleteIndex = CHECKOUT_STEP_DEFINITIONS.findIndex((step) => step.fields.some((field) => invalidFields.has(field)))
  return firstIncompleteIndex === STEP_NOT_FOUND ? CHECKOUT_STEP_DEFINITIONS.length - 1 : firstIncompleteIndex
}
const STEP_NOT_FOUND = -1
export const CHECKOUT_STEP_ID = {
  BILLING: "billing",
  CONTACT: "contact",
  DELIVERY: "delivery",
  PAYMENT: "payment",
} as const
export type CheckoutStepId = (typeof CHECKOUT_STEP_ID)[keyof typeof CHECKOUT_STEP_ID]
export interface CheckoutStepDefinition {
  readonly fields: readonly (keyof CheckoutFormSchema)[]
  readonly id: CheckoutStepId
  readonly titleKey: string
}
export const CHECKOUT_STEP_DEFINITIONS: readonly CheckoutStepDefinition[] = [
  {
    fields: ["email", "phone"],
    id: CHECKOUT_STEP_ID.CONTACT,
    titleKey: "steps.contact",
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
      "billingCountryCode",
    ],
    id: CHECKOUT_STEP_ID.BILLING,
    titleKey: "steps.billing",
  },
  {
    fields: ["deliveryMethod", "lockerId"],
    id: CHECKOUT_STEP_ID.DELIVERY,
    titleKey: "steps.delivery",
  },
  {
    fields: [],
    id: CHECKOUT_STEP_ID.PAYMENT,
    titleKey: "steps.payment",
  },
] as const
