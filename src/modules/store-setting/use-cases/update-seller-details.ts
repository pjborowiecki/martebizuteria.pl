import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleSellerDetailsInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { buildAuditChangeMetadata, toAuditMetadataRecord } from "~/src/modules/audit-log/audit-log.diff.utils"
import { recordSettingsUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { readSellerDetails, saveSellerDetailsIfUnchanged } from "~/src/modules/store-setting/store-setting.accessors"
import {
  SELLER_DETAILS_AUDIT_TARGET,
  SELLER_DETAILS_FIELDS,
  STORE_SETTING_MUTATION_KEYS,
} from "~/src/modules/store-setting/store-setting.constants"
import { storeSettingZodSchemas } from "~/src/modules/store-setting/store-setting.zod"

export const updateSellerDetails = createServerFn({ method: "POST" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof storeSettingZodSchemas.sellerDetailsUpdateInput>) =>
    storeSettingZodSchemas.sellerDetailsUpdateInput.parse(input),
  )
  .handler(async ({ data: { expectedUpdatedAt, ...details } }) => {
    const current = await readSellerDetails()
    const change = buildAuditChangeMetadata(current, details, SELLER_DETAILS_FIELDS)
    if (change === undefined) {
      return current
    }

    const saved = await saveSellerDetailsIfUnchanged({ details, expectedUpdatedAt })
    if (saved === undefined) {
      throw new AppError(ERROR_CODES.CONFLICT)
    }

    scheduleSellerDetailsInvalidation()
    recordSettingsUpdatedAudit(SELLER_DETAILS_AUDIT_TARGET, { metadata: toAuditMetadataRecord(change) })

    return saved
  })

export const updateSellerDetailsMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof updateSellerDetails>[0]["data"]) => updateSellerDetails({ data }),
  mutationKey: STORE_SETTING_MUTATION_KEYS.UPDATE_SELLER_DETAILS,
})
