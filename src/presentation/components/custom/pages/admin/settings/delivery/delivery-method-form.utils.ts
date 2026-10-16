import { type ZodType, type output } from "zod/v4"

import { INPOST_COURIER_CODE } from "~/src/modules/courier/courier.constants"
import { DELIVERY_METHOD, type DeliveryMethodType } from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { deliveryMethodZodSchemas } from "~/src/modules/delivery-method/delivery-method.zod"

export const NEW_COURIER = "new"

export const toDeliveryMethodFormState = (
  method: DeliveryMethod["adminMethod"] | undefined,
  couriers: DeliveryMethod["adminList"]["couriers"],
): DeliveryMethodFormState =>
  method === undefined
    ? {
        courierId: couriers.find((courier) => courier.internalCode === INPOST_COURIER_CODE)?.id ?? NEW_COURIER,
        courierName: "",
        isActive: true,
        names: { "en-US": "", "pl-PL": "" },
        price: undefined,
        type: DELIVERY_METHOD.COURIER,
      }
    : {
        courierId: method.courier.id,
        courierName: "",
        isActive: method.isActive,
        names: method.names,
        price: method.price,
        type: method.type,
      }

export const usesInpostOnly = (type: DeliveryMethodType): boolean => type === DELIVERY_METHOD.LOCKER

export const resolveFormCourierId = (state: DeliveryMethodFormState, couriers: DeliveryMethod["adminList"]["couriers"]): string =>
  usesInpostOnly(state.type)
    ? (couriers.find((courier) => courier.internalCode === INPOST_COURIER_CODE)?.id ?? state.courierId)
    : state.courierId

const toFieldErrors = (issues: readonly { readonly message: string; readonly path: readonly PropertyKey[] }[]): DeliveryMethodFieldErrors =>
  Object.fromEntries(issues.map((issue) => [issue.path.map(String).join("."), issue.message]))

const validateSubmission = <TSchema extends ZodType>(schema: TSchema, input: unknown): DeliveryMethodSubmission<output<TSchema>> => {
  const parsed = schema.safeParse(input)

  return parsed.success ? { input: parsed.data } : { errors: toFieldErrors(parsed.error.issues) }
}

export const toCreateDeliveryMethodInput = (state: DeliveryMethodFormState, couriers: DeliveryMethod["adminList"]["couriers"]) => {
  const courierId = resolveFormCourierId(state, couriers)

  return validateSubmission(deliveryMethodZodSchemas.createInput, {
    courier: courierId === NEW_COURIER ? { name: state.courierName } : { id: courierId },
    isActive: state.isActive,
    names: state.names,
    price: state.price,
    type: state.type,
  })
}

export const toUpdateDeliveryMethodInput = (state: DeliveryMethodFormState, method: DeliveryMethod["adminMethod"]) =>
  validateSubmission(deliveryMethodZodSchemas.updateInput, {
    expectedUpdatedAt: method.updatedAt,
    id: method.id,
    isActive: state.isActive,
    names: state.names,
    price: state.price,
  })

export interface DeliveryMethodFormState {
  readonly courierId: string
  readonly courierName: string
  readonly isActive: boolean
  readonly names: DeliveryMethod["names"]
  readonly price: number | undefined
  readonly type: DeliveryMethodType
}

export type DeliveryMethodFieldErrors = Partial<Record<string, string>>

type DeliveryMethodSubmission<TInput> = { readonly errors: DeliveryMethodFieldErrors } | { readonly input: TInput }
