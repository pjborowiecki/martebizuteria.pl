import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";

import { CONSTANTS } from "~/src/constants";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";

import { publishRealtimeInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.publish.server";

import { auditLogAccessors } from "~/src/modules/audit-log/audit-log.accessors";

const MIN_AUDIT_LOG_ID_LENGTH = 1;

const deleteAuditLogsInput = z.array(z.string().min(MIN_AUDIT_LOG_ID_LENGTH));

const deleteAuditLogsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteAuditLogsInput.parse(data))
  .handler(async ({ data: ids }) => {
    await assertAdmin();

    const deleted = await auditLogAccessors.deleteAuditLogs(ids);

    await publishRealtimeInvalidation({
      admin: [CONSTANTS.QUERY_KEYS.AUDIT_LOG.ADMIN.PAGE, CONSTANTS.QUERY_KEYS.AUDIT_LOG.ADMIN.STATS]
    });

    return { deleted, ok: true as const };
  });

export const auditLogMutations = {
  deleteAuditLogsFn
};
