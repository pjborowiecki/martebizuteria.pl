import type { JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { AuditLog } from "~/src/components/custom/pages/admin/audit/audit-log";

export const Route = createFileRoute("/{-$locale}/admin/audit")({
  component: AuditPage
});

function AuditPage(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <>
      <AdminHeader description={t("audit.description")} title={t("audit.title")} />
      <AuditLog />
    </>
  );
}
