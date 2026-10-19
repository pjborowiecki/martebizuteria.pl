import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import zod from "zod/v4"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleSalesStatusInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { recordSalesPausedAudit, recordSalesResumedAudit } from "~/src/modules/audit-log/use-cases/record-settings-audit.server"
import { changeSalesPaused } from "~/src/modules/store-setting/store-setting.accessors"
import { STORE_SETTING_ID, STORE_SETTING_MUTATION_KEYS } from "~/src/modules/store-setting/store-setting.constants"
import { type SalesStatus } from "~/src/modules/store-setting/use-cases/get-sales-status"

const setSalesPausedInputSchema = zod.object({ salesPaused: zod.boolean() })

export const setSalesPaused = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof setSalesPausedInputSchema>) => setSalesPausedInputSchema.parse(input))
  .handler(async ({ data: { salesPaused } }): Promise<SalesStatus> => {
    if (await changeSalesPaused(salesPaused)) {
      scheduleSalesStatusInvalidation()
      if (salesPaused) {
        recordSalesPausedAudit(STORE_SETTING_ID)
      } else {
        recordSalesResumedAudit(STORE_SETTING_ID)
      }
    }

    return { salesPaused }
  })

export const setSalesPausedMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof setSalesPaused>[0]["data"]) => setSalesPaused({ data }),
  mutationKey: STORE_SETTING_MUTATION_KEYS.SET_SALES_PAUSED,
})
