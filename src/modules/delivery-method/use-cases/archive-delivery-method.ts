import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleDeliveryMethodsInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { recordDeliveryMethodAudit } from "~/src/modules/audit-log/use-cases/record-settings-audit.server"
import {
  findDeliveryMethodById,
  listOfferedDeliveryMethods,
  setDeliveryMethodArchived,
} from "~/src/modules/delivery-method/delivery-method.accessors"
import { DELIVERY_METHOD_ERROR, DELIVERY_METHOD_MUTATION_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { resolveOfferedDeliveryConflict } from "~/src/modules/delivery-method/delivery-method.utils"
import { deliveryMethodZodSchemas } from "~/src/modules/delivery-method/delivery-method.zod"

export const archiveDeliveryMethod = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof deliveryMethodZodSchemas.archiveInput>) => deliveryMethodZodSchemas.archiveInput.parse(input))
  .handler(async ({ data }) => {
    const current = await findDeliveryMethodById(data.id)
    if (current === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND, DELIVERY_METHOD_ERROR.NOT_FOUND)
    }

    const conflict = data.archived
      ? resolveOfferedDeliveryConflict({
          candidate: { id: data.id, isOffered: false, type: current.type },
          offered: await listOfferedDeliveryMethods(),
        })
      : undefined
    if (conflict !== undefined) {
      throw new AppError(ERROR_CODES.CONFLICT, conflict)
    }

    await setDeliveryMethodArchived(data.id, data.archived)
    scheduleDeliveryMethodsInvalidation()
    recordDeliveryMethodAudit(
      data.archived ? AUDIT_LOG_ACTION.DELIVERY_METHOD_ARCHIVED : AUDIT_LOG_ACTION.DELIVERY_METHOD_RESTORED,
      current.names["pl-PL"],
    )

    return { id: data.id }
  })

export const archiveDeliveryMethodMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof archiveDeliveryMethod>[0]["data"]) => archiveDeliveryMethod({ data }),
  mutationKey: DELIVERY_METHOD_MUTATION_KEYS.ARCHIVE,
})
