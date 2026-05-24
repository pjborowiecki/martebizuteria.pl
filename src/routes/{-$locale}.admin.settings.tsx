import type { JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { SettingsPage } from "~/src/components/custom/pages/admin/settings/settings-page";

export const Route = createFileRoute("/{-$locale}/admin/settings")({
  component: AdminSettingsRoute
});

function AdminSettingsRoute(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <>
      <AdminHeader description={t("settings.description")} title={t("settings.title")} />
      <SettingsPage />
    </>
  );
}
