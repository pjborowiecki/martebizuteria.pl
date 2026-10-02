import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { scheduleContentPageInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordContentPageUpdatedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { findContentPageByHandle, updateContentPageIfUnchanged } from "~/src/modules/content-page/content-page.accessors"
import { CONTENT_PAGE_MUTATION_KEYS } from "~/src/modules/content-page/content-page.constants"
import { reviseChangedLocales } from "~/src/modules/content-page/content-page.utils"
import { contentPageZodSchemas } from "~/src/modules/content-page/content-page.zod"

export const updateContentPage = createServerFn({ method: "POST" })
  .middleware([authorized({ content: ["update"] })])
  .validator((input: zod.input<typeof contentPageZodSchemas.updateInput>) => contentPageZodSchemas.updateInput.parse(input))
  .handler(async ({ data }) => {
    const current = await findContentPageByHandle(data.handle)
    const updated = current === undefined ? undefined : await updateContentPageIfUnchanged(data, reviseChangedLocales(current, data))
    if (updated === undefined) {
      throw new AppError(ERROR_CODES.CONFLICT)
    }

    scheduleContentPageInvalidation()
    recordContentPageUpdatedAudit(data.handle)

    return updated
  })

export const updateContentPageMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof updateContentPage>[0]["data"]) => updateContentPage({ data }),
  mutationKey: CONTENT_PAGE_MUTATION_KEYS.UPDATE,
})
