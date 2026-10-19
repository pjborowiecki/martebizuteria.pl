import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { recordListExportedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { getAdminSubscribersFilteredList } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors"
import { type Newsletter } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"
import { toAdminNewsletterListItem } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.utils"
import { newsletterZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"

export const exportAdminNewsletterSubscribers = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["list"] })])
  .validator((input: zod.input<typeof newsletterZodSchemas.adminNewsletterExportInput>) =>
    newsletterZodSchemas.adminNewsletterExportInput.parse(input),
  )
  .handler(async ({ data: input }): Promise<Newsletter["adminListItem"][]> => {
    const rows = await getAdminSubscribersFilteredList({ search: normalizeAdminSearchTerm(input.search), status: input.status })
    recordListExportedAudit("newsletterSubscribers", rows.length, { metadata: { filters: input } })

    return rows.map((row) => toAdminNewsletterListItem(row))
  })
