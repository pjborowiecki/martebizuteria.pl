import { isValidPhoneNumber } from "libphonenumber-js"
import zod from "zod/v4"

import { COUNTRIES } from "~/src/modules/_core/constants/country"
import { isValidNip, isValidRegon, normalizeNip, normalizeRegon } from "~/src/modules/_core/utils/polish-business-ids"
import { SELLER_DETAILS_MAX_LENGTH } from "~/src/modules/store-setting/store-setting.constants"

const POLISH_POSTAL_CODE = /^\d{2}-\d{3}$/u

const requiredText = (field: keyof typeof SELLER_DETAILS_MAX_LENGTH) =>
  zod.string().trim().min(1, `${field}Required`).max(SELLER_DETAILS_MAX_LENGTH[field], `${field}TooLong`)

const checkedNumber = (field: "nip" | "regon", normalize: (value: string) => string, isValid: (value: string) => boolean) =>
  zod
    .string()
    .overwrite(normalize)
    .min(1, `${field}Required`)
    .pipe(zod.string().refine(isValid, `${field}Invalid`))

const sellerDetails = zod
  .object({
    city: requiredText("city"),
    countryCode: zod.enum(
      COUNTRIES.map((country) => country.alpha2),
      "countryInvalid",
    ),
    email: requiredText("email").pipe(zod.email("emailInvalid")),
    legalName: requiredText("legalName"),
    nip: checkedNumber("nip", normalizeNip, isValidNip),
    phone: requiredText("phone").pipe(zod.string().refine((phone) => isValidPhoneNumber(phone), "phoneInvalid")),
    postalCode: requiredText("postalCode"),
    regon: checkedNumber("regon", normalizeRegon, isValidRegon),
    street: requiredText("street"),
  })
  .refine(({ countryCode, postalCode }) => countryCode !== "PL" || POLISH_POSTAL_CODE.test(postalCode), {
    error: "postalCodeInvalid",
    path: ["postalCode"],
    when: ({ issues }) => issues.every((issue) => issue.path?.[0] !== "postalCode" && issue.path?.[0] !== "countryCode"),
  })

export const storeSettingZodSchemas = {
  sellerDetails,
  sellerDetailsUpdateInput: sellerDetails.safeExtend({ expectedUpdatedAt: zod.date() }),
}
