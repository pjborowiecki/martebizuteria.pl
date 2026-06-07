import { useSuspenseQuery } from "@tanstack/react-query";
import { useLocale } from "use-intl";

import { adminDashboardQueryOptions } from "~/src/modules/admin-dashboard/admin-dashboard.queries";

export function useAdminDashboardSnapshot() {
  const locale = useLocale();

  return useSuspenseQuery(adminDashboardQueryOptions.adminDashboardSnapshotQueryOptions({ locale }));
}
