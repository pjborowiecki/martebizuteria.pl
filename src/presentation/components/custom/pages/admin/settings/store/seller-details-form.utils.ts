import { type SellerDetailsField } from "~/src/modules/store-setting/store-setting.constants"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"
import { storeSettingZodSchemas } from "~/src/modules/store-setting/store-setting.zod"

export const toSellerDetailsForm = ({ updatedAt, ...values }: StoreSetting["storedSellerDetails"]): SellerDetailsForm => ({
  updatedAt,
  values,
})

export const toSellerDetailsSubmission = ({ updatedAt, values }: SellerDetailsForm): SellerDetailsSubmission => {
  const parsed = storeSettingZodSchemas.sellerDetailsUpdateInput.safeParse({ ...values, expectedUpdatedAt: updatedAt })

  return parsed.success
    ? { input: parsed.data }
    : { errors: Object.fromEntries(parsed.error.issues.toReversed().map((issue) => [String(issue.path[0]), issue.message])) }
}

export interface SellerDetailsForm {
  readonly updatedAt: Date
  readonly values: StoreSetting["sellerDetails"]
}

export type SellerDetailsFieldErrors = Partial<Record<SellerDetailsField, string>>

type SellerDetailsSubmission =
  | { readonly errors: SellerDetailsFieldErrors }
  | { readonly input: StoreSetting["sellerDetailsValues"] & { readonly expectedUpdatedAt: Date } }
