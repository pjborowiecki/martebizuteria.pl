import { z } from "zod/v4";

const MIN_LENGTH = 1;

export const checkoutSchema = z.object({
  addressLine1: z.string().min(MIN_LENGTH, "validation.addressRequired"),
  cardCvv: z.string(),
  cardExpiry: z.string(),
  cardNumber: z.string(),
  cardholderName: z.string(),
  city: z.string().min(MIN_LENGTH, "validation.cityRequired"),
  country: z.string().min(MIN_LENGTH, "validation.countryRequired"),
  deliveryMethod: z.string().min(MIN_LENGTH, "validation.deliveryRequired"),
  firstName: z.string().min(MIN_LENGTH, "validation.firstNameRequired"),
  lastName: z.string().min(MIN_LENGTH, "validation.lastNameRequired"),
  paymentMethod: z.string().min(MIN_LENGTH, "validation.paymentRequired"),
  postCode: z.string().min(MIN_LENGTH, "validation.postCodeRequired"),
  saveCard: z.boolean()
});

export type CheckoutFormSchema = z.infer<typeof checkoutSchema>;
