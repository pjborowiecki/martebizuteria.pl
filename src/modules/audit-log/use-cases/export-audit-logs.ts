import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { resolveRequestDisplayPreferences } from "~/src/integrations/use-intl/i18n.display-preferences"

import { LIST_PAGE_FIRST, LIST_PAGE_SIZE_MAX, listPaginationParamsFromPage } from "~/src/modules/_core/utils/pagination"
import { buildAdminAuditLogsFilterParams, getAdminAuditLogsPage } from "~/src/modules/audit-log/audit-log.accessors"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { toAdminAuditListItem } from "~/src/modules/audit-log/audit-log.utils"
import { auditLogZodSchemas } from "~/src/modules/audit-log/audit-log.zod"
import { recordListExportedAudit } from "~/src/modules/audit-log/use-cases/record-list-export-audit.server"

export interface AuditLogsExportPage {
  readonly hasMore: boolean
  readonly items: AuditLog["adminListItem"][]
  readonly until: number
}

export const exportAuditLogs = createServerFn({ method: "GET" })
  .middleware([authorized({ settings: ["manage"] })])
  .validator((input: zod.input<typeof auditLogZodSchemas.adminAuditLogsExportInput>) =>
    auditLogZodSchemas.adminAuditLogsExportInput.parse(input),
  )
  .handler(async ({ data: { page = LIST_PAGE_FIRST, until = Date.now(), ...filters } }): Promise<AuditLogsExportPage> => {
    const preferences = await resolveRequestDisplayPreferences()
    const { rows, total } = await getAdminAuditLogsPage({
      ...listPaginationParamsFromPage(page, LIST_PAGE_SIZE_MAX),
      ...buildAdminAuditLogsFilterParams(filters, preferences.timeZone),
      until: new Date(until),
    })
    if (total !== undefined) {
      recordListExportedAudit("auditLogs", total, { metadata: { filters } })
    }

    return { hasMore: rows.length === LIST_PAGE_SIZE_MAX, items: rows.map((row) => toAdminAuditListItem(row, preferences)), until }
  })
