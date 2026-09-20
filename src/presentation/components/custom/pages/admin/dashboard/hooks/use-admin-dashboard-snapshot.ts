import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale } from "use-intl"

import { adminDashboardSnapshotQueryOptions } from "~/src/modules/admin-dashboard/use-cases/get-dashboard-snapshot"
export const useAdminDashboardSnapshot = () => {
  const locale = useLocale()
  return useSuspenseQuery(
    adminDashboardSnapshotQueryOptions({
      locale,
    }),
  )
}
