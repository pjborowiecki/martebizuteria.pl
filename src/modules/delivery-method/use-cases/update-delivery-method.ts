import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleDeliveryMethodsInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { buildAuditChangeMetadata, toAuditMetadataRecord } from "~/src/modules/audit-log/audit-log.diff.utils"
import { recordDeliveryMethodUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import {
  findDeliveryMethodById,
  listOfferedDeliveryMethods,
  updateDeliveryMethodIfUnchanged,
} from "~/src/modules/delivery-method/delivery-method.accessors"
import { DELIVERY_METHOD_ERROR, DELIVERY_METHOD_MUTATION_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { resolveOfferedDeliveryConflict, toDeliveryMethodAuditSnapshot } from "~/src/modules/delivery-method/delivery-method.utils"
import { deliveryMethodZodSchemas } from "~/src/modules/delivery-method/delivery-method.zod"

export const updateDeliveryMethod = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof deliveryMethodZodSchemas.updateInput>) => deliveryMethodZodSchemas.updateInput.parse(input))
  .handler(async ({ data }) => {
    const current = await findDeliveryMethodById(data.id)
    if (current === undefined || current.archivedAt !== null) {
      throw new AppError(ERROR_CODES.NOT_FOUND, DELIVERY_METHOD_ERROR.NOT_FOUND)
    }

    const conflict = resolveOfferedDeliveryConflict({
      candidate: { id: data.id, isOffered: data.isActive && current.courier.isActive, type: current.type },
      offered: await listOfferedDeliveryMethods(),
    })
    if (conflict !== undefined) {
      throw new AppError(ERROR_CODES.CONFLICT, conflict)
    }

    const updated = await updateDeliveryMethodIfUnchanged({
      expectedUpdatedAt: data.expectedUpdatedAt,
      id: data.id,
      values: { isActive: data.isActive, name: data.names["pl-PL"], names: data.names, price: data.price },
    })
    if (updated === undefined) {
      throw new AppError(ERROR_CODES.CONFLICT)
    }

    const change = buildAuditChangeMetadata(toDeliveryMethodAuditSnapshot(current), toDeliveryMethodAuditSnapshot(data), [
      "availability",
      "nameEn",
      "namePl",
      "price",
    ])
    scheduleDeliveryMethodsInvalidation()
    recordDeliveryMethodUpdatedAudit(data.names["pl-PL"], change === undefined ? undefined : { metadata: toAuditMetadataRecord(change) })

    return { id: updated.id }
  })

export const updateDeliveryMethodMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof updateDeliveryMethod>[0]["data"]) => updateDeliveryMethod({ data }),
  mutationKey: DELIVERY_METHOD_MUTATION_KEYS.UPDATE,
})
