import type { JSX } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { ADMIN_CATALOG_PAGE_BODY_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { CustomersTableContent } from "~/src/components/custom/pages/admin/customers/components/customers-table";

import { ADMIN_CUSTOMER_PAGE_SIZE, ADMIN_CUSTOMER_QUERY_STALE_MS } from "~/src/modules/user/user.constants";
import { userQueryOptions } from "~/src/modules/user/user.queries";

async function prefetchCustomersQueries(context: { queryClient: QueryClient }): Promise<void> {
  await Promise.all([
    context.queryClient.ensureQueryData(
      userQueryOptions.adminCustomersPageQueryOptions({
        page: 1,
        pageSize: ADMIN_CUSTOMER_PAGE_SIZE
      })
    ),
    context.queryClient.ensureQueryData(userQueryOptions.adminCustomerStatsQueryOptions())
  ]);
}

export const Route = createFileRoute("/{-$locale}/admin/customers/")({
  component: CustomersIndexRoute,
  loader: ({ context }) => prefetchCustomersQueries(context),
  shouldReload: false,
  staleTime: ADMIN_CUSTOMER_QUERY_STALE_MS
});

function CustomersIndexRoute(): JSX.Element {
  const t = useTranslations("pages.admin.customers");

  return (
    <>
      <AdminHeader title={t("title")} description={t("description")} />

      <div className={ADMIN_CATALOG_PAGE_BODY_CLASS}>
        <CustomersTableContent />
      </div>
    </>
  );
}
