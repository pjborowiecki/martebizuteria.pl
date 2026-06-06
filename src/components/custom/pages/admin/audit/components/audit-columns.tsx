import { useMemo } from "react";

import { useTranslations } from "use-intl";

import { buildAuditColumns } from "~/src/components/custom/pages/admin/audit/lib/audit-column-defs";

export function useAuditColumns() {
  const t = useTranslations("pages.admin");

  return useMemo(() => buildAuditColumns({ t }), [t]);
}
