import { type JSX, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";

import { type LocalizedTo } from "~/src/components/custom/localized-link";
import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { MarketingCampaignsTable } from "~/src/components/custom/pages/admin/marketing/marketing-campaigns-table";
import { MarketingEngagementChart } from "~/src/components/custom/pages/admin/marketing/marketing-engagement-chart";
import { MarketingStats } from "~/src/components/custom/pages/admin/marketing/marketing-stats";

export const Route = createFileRoute("/{-$locale}/admin/marketing")({
  component: MarketingPage
});

function MarketingPage(): JSX.Element {
  const t = useTranslations("pages.admin");

  const bcList = useMemo(
    () => [{ href: CONSTANTS.ROUTES.ADMIN, label: t("nav.dashboard") } satisfies { href: LocalizedTo; label: string }],
    [t]
  );
  const actionButtons = useMemo(
    () => (
      <>
        <Button
          className="h-9 gap-2 border-sidebar-border bg-sidebar text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          size="sm"
          variant="outline"
        >
          <Download className="size-4" strokeWidth={1.5} />
          {t("customers.actions.export")}
        </Button>
        <Button size="sm" className="h-9 gap-2 bg-foreground text-sm text-background hover:bg-foreground/90">
          <Plus className="size-4" strokeWidth={1.5} />
          {t("marketing.actions.newCampaign")}
        </Button>
      </>
    ),
    [t]
  );

  return (
    <>
      <AdminHeader title={t("marketing.title")} description={t("marketing.description")} breadcrumbs={bcList} actions={actionButtons} />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-8">
        <MarketingStats />
        <MarketingEngagementChart />
        <MarketingCampaignsTable />
      </div>
    </>
  );
}
