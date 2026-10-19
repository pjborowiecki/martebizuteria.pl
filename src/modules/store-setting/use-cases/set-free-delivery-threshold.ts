import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleFreeDeliveryInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { recordSettingsUpdatedAudit } from "~/src/modules/audit-log/use-cases/record-settings-audit.server"
import { findFreeDeliveryThreshold, saveFreeDeliveryThreshold } from "~/src/modules/store-setting/store-setting.accessors"
import { FREE_DELIVERY_THRESHOLD_MAX, STORE_SETTING_MUTATION_KEYS } from "~/src/modules/store-setting/store-setting.constants"
import { type FreeDelivery } from "~/src/modules/store-setting/use-cases/get-free-delivery"

const setFreeDeliveryThresholdInputSchema = zod.object({
  threshold: zod.int("thresholdInvalid").min(1, "thresholdInvalid").max(FREE_DELIVERY_THRESHOLD_MAX, "thresholdTooHigh").optional(),
})

export const setFreeDeliveryThreshold = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof setFreeDeliveryThresholdInputSchema>) => setFreeDeliveryThresholdInputSchema.parse(input))
  .handler(async ({ data: { threshold } }): Promise<FreeDelivery> => {
    const before = await findFreeDeliveryThreshold()
    if (before !== threshold) {
      await saveFreeDeliveryThreshold(threshold)
      scheduleFreeDeliveryInvalidation()
      recordSettingsUpdatedAudit("free-delivery", {
        metadata: { changed: ["freeDeliveryThreshold"], new: { freeDeliveryThreshold: threshold }, old: { freeDeliveryThreshold: before } },
      })
    }

    return { threshold }
  })

export const setFreeDeliveryThresholdMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof setFreeDeliveryThreshold>[0]["data"]) => setFreeDeliveryThreshold({ data }),
  mutationKey: STORE_SETTING_MUTATION_KEYS.SET_FREE_DELIVERY_THRESHOLD,
})
