import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleDeliveryMethodsInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { recordDeliveryMethodAudit } from "~/src/modules/audit-log/use-cases/record-settings-audit.server"
import { setDeliveryMethodRanks } from "~/src/modules/delivery-method/delivery-method.accessors"
import { DELIVERY_METHOD_MUTATION_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { deliveryMethodZodSchemas } from "~/src/modules/delivery-method/delivery-method.zod"

export const reorderDeliveryMethods = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof deliveryMethodZodSchemas.reorderInput>) => deliveryMethodZodSchemas.reorderInput.parse(input))
  .handler(async ({ data: orderedIds }) => {
    await setDeliveryMethodRanks(orderedIds)
    scheduleDeliveryMethodsInvalidation()
    recordDeliveryMethodAudit(AUDIT_LOG_ACTION.DELIVERY_METHOD_REORDERED, "delivery-methods")

    return { ok: true }
  })

export const reorderDeliveryMethodsMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof reorderDeliveryMethods>[0]["data"]) => reorderDeliveryMethods({ data }),
  mutationKey: DELIVERY_METHOD_MUTATION_KEYS.REORDER,
})
