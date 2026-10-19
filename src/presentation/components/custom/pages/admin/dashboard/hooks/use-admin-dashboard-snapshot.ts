import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale } from "use-intl/react"

import { getDashboardSnapshotQuery } from "~/src/modules/order/use-cases/get-dashboard-snapshot"

export const useAdminDashboardSnapshot = () => {
  const locale = useLocale()

  return useSuspenseQuery(
    getDashboardSnapshotQuery({
      locale,
    }),
  )
}
