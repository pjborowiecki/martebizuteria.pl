import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleDeliveryMethodsInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { recordDeliveryMethodAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { findCourierById } from "~/src/modules/courier/courier.accessors"
import { INPOST_COURIER_CODE } from "~/src/modules/courier/courier.constants"
import {
  insertDeliveryMethod,
  listOfferedDeliveryMethods,
  nextDeliveryMethodRank,
} from "~/src/modules/delivery-method/delivery-method.accessors"
import {
  DELIVERY_METHOD,
  DELIVERY_METHOD_ERROR,
  DELIVERY_METHOD_MUTATION_KEYS,
} from "~/src/modules/delivery-method/delivery-method.constants"
import { resolveOfferedDeliveryConflict } from "~/src/modules/delivery-method/delivery-method.utils"
import { deliveryMethodZodSchemas } from "~/src/modules/delivery-method/delivery-method.zod"

type CreateInput = zod.output<typeof deliveryMethodZodSchemas.createInput>

const resolveCarrier = async (courier: CreateInput["courier"]) => {
  if ("name" in courier) {
    return { id: crypto.randomUUID(), internalCode: crypto.randomUUID(), isActive: true, isNew: true, name: courier.name }
  }

  const carrier = await findCourierById(courier.id)
  if (carrier === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND)
  }

  return { ...carrier, isNew: false }
}

export const createDeliveryMethod = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof deliveryMethodZodSchemas.createInput>) => deliveryMethodZodSchemas.createInput.parse(input))
  .handler(async ({ data }) => {
    const carrier = await resolveCarrier(data.courier)
    if (data.type === DELIVERY_METHOD.LOCKER && carrier.internalCode !== INPOST_COURIER_CODE) {
      throw new AppError(ERROR_CODES.VALIDATION, DELIVERY_METHOD_ERROR.LOCKER_NEEDS_INPOST)
    }

    const conflict = resolveOfferedDeliveryConflict({
      candidate: { id: undefined, isOffered: data.isActive && carrier.isActive, type: data.type },
      offered: await listOfferedDeliveryMethods(),
    })
    if (conflict !== undefined) {
      throw new AppError(ERROR_CODES.CONFLICT, conflict)
    }

    const id = crypto.randomUUID()
    await insertDeliveryMethod({
      method: {
        apiServiceCode: `${carrier.internalCode}_${data.type}`,
        courierId: carrier.id,
        id,
        isActive: data.isActive,
        name: data.names["pl-PL"],
        names: data.names,
        price: data.price,
        rank: await nextDeliveryMethodRank(),
        type: data.type,
      },
      newCourier: carrier.isNew ? { id: carrier.id, internalCode: carrier.internalCode, name: carrier.name } : undefined,
    })
    scheduleDeliveryMethodsInvalidation()
    recordDeliveryMethodAudit(AUDIT_LOG_ACTION.DELIVERY_METHOD_CREATED, data.names["pl-PL"])

    return { id }
  })

export const createDeliveryMethodMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof createDeliveryMethod>[0]["data"]) => createDeliveryMethod({ data }),
  mutationKey: DELIVERY_METHOD_MUTATION_KEYS.CREATE,
})
