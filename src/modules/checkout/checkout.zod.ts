import { createSchemaFactory } from "drizzle-zod";
// Use the `mobile` metadata bundle: the default (`min`) bundle does not encode
// number lengths, so it leniently accepts impossible numbers (e.g. a 7-digit
// "5155010"). `mobile` enforces real mobile length/pattern rules and stays far
// smaller than `max` (which is too large to load in the worker dev runtime).
import { isValidPhoneNumber } from "libphonenumber-js/mobile";
import { z } from "zod";

import { address } from "~/src/modules/address/address.schema";
import { checkout } from "~/src/modules/checkout/checkout.schema";

const { createInsertSchema, createSelectSchema, createUpdateSchema } = createSchemaFactory({
  zodInstance: z
});

const MIN_LENGTH = 1;

// Default country for the storefront. Phone + postcode are validated against it.
// Extend the matrices below to support additional shipping destinations.
const DEFAULT_COUNTRY = "PL";

const POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
  PL: /^\d{2}-\d{3}$/u
};

function isValidPostalCode(countryCode: string, postalCode: string): boolean {
  const pattern = POSTAL_CODE_PATTERNS[countryCode];
  return pattern === undefined ? true : pattern.test(postalCode.trim());
}

// The checkout phone is used for delivery/SMS contact, so require a real mobile
// number for the storefront's default country (the `mobile` bundle only treats
// valid mobile numbers as valid).
function isValidCheckoutPhone(value: string): boolean {
  try {
    return isValidPhoneNumber(value, DEFAULT_COUNTRY);
  } catch {
    return false;
  }
}

const baseAddressSchema = createInsertSchema(address)
  .pick({
    address1: true,
    address2: true,
    city: true,
    countryCode: true,
    firstName: true,
    lastName: true,
    postalCode: true,
    province: true
  })
  .extend({
    address1: z.string().min(MIN_LENGTH, "validation.addressRequired"),
    city: z.string().min(MIN_LENGTH, "validation.cityRequired"),
    countryCode: z.string().min(MIN_LENGTH, "validation.countryRequired"),
    firstName: z.string().min(MIN_LENGTH, "validation.firstNameRequired"),
    lastName: z.string().min(MIN_LENGTH, "validation.lastNameRequired"),
    postalCode: z.string().min(MIN_LENGTH, "validation.postCodeRequired")
  });

export const checkoutSchema = baseAddressSchema
  .extend({
    billingAddress1: z.string().optional(),
    billingCity: z.string().optional(),
    billingCountryCode: z.string().optional(),
    billingFirstName: z.string().optional(),
    billingLastName: z.string().optional(),
    billingPostalCode: z.string().optional(),
    deliveryMethod: z.string().min(MIN_LENGTH, "validation.deliveryRequired"),
    deliveryMethodType: z.string().optional(),
    deliveryNotes: z.string().optional(),
    email: z.email({ message: "validation.emailInvalid" }),
    // City of the chosen InPost locker. Persisted only to restore the picker's
    // search + selection when the shopper reopens the map; not used server-side.
    lockerCity: z.string().optional(),
    lockerId: z.string().optional(),
    phone: z.string().min(MIN_LENGTH, "validation.phoneRequired").refine(isValidCheckoutPhone, { message: "validation.phoneInvalid" }),
    sameAsShipping: z.boolean().default(true),
    saveBillingAddress: z.boolean().default(false),
    saveShippingAddress: z.boolean().default(false),
    storeLocation: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.postalCode.length >= MIN_LENGTH && !isValidPostalCode(data.countryCode, data.postalCode)) {
      ctx.addIssue({
        code: "custom",
        message: "validation.postCodeInvalid",
        path: ["postalCode"]
      });
    }

    if (!data.sameAsShipping) {
      if (typeof data.billingAddress1 !== "string" || data.billingAddress1.length < MIN_LENGTH) {
        ctx.addIssue({
          code: "custom",
          message: "validation.addressRequired",
          path: ["billingAddress1"]
        });
      }
      if (typeof data.billingFirstName !== "string" || data.billingFirstName.length < MIN_LENGTH) {
        ctx.addIssue({
          code: "custom",
          message: "validation.firstNameRequired",
          path: ["billingFirstName"]
        });
      }
      if (typeof data.billingLastName !== "string" || data.billingLastName.length < MIN_LENGTH) {
        ctx.addIssue({
          code: "custom",
          message: "validation.lastNameRequired",
          path: ["billingLastName"]
        });
      }
      if (typeof data.billingCity !== "string" || data.billingCity.length < MIN_LENGTH) {
        ctx.addIssue({
          code: "custom",
          message: "validation.cityRequired",
          path: ["billingCity"]
        });
      }
      if (typeof data.billingCountryCode !== "string" || data.billingCountryCode.length < MIN_LENGTH) {
        ctx.addIssue({
          code: "custom",
          message: "validation.countryRequired",
          path: ["billingCountryCode"]
        });
      }
      if (typeof data.billingPostalCode !== "string" || data.billingPostalCode.length < MIN_LENGTH) {
        ctx.addIssue({
          code: "custom",
          message: "validation.postCodeRequired",
          path: ["billingPostalCode"]
        });
      } else if (!isValidPostalCode(data.billingCountryCode ?? DEFAULT_COUNTRY, data.billingPostalCode)) {
        ctx.addIssue({
          code: "custom",
          message: "validation.postCodeInvalid",
          path: ["billingPostalCode"]
        });
      }
    }

    if (data.deliveryMethodType === "locker" && (typeof data.lockerId !== "string" || data.lockerId.trim().length < MIN_LENGTH)) {
      ctx.addIssue({
        code: "custom",
        message: "validation.lockerIdRequired",
        path: ["lockerId"]
      });
    }
  });

export type CheckoutFormSchema = z.input<typeof checkoutSchema>;

export const checkoutZodSchemas = {
  insert: createInsertSchema(checkout),
  select: createSelectSchema(checkout),
  update: createUpdateSchema(checkout)
};
