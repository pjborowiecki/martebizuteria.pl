import { useMemo } from "react";

import { useLocale, useTranslations } from "use-intl";

import { buildOrderColumns } from "~/src/components/custom/pages/admin/orders/lib/orders-column-defs";

export function useOrderColumns() {
  const t = useTranslations("pages.admin.orders");
  const tAdmin = useTranslations("pages.admin");
  const locale = useLocale();

  return useMemo(() => buildOrderColumns({ locale, t, tAdmin }), [locale, t, tAdmin]);
}
