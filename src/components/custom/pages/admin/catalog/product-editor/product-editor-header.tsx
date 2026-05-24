import { type JSX, useMemo } from "react";

import { Check, Eye } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Badge } from "~/src/components/shadcn/badge";
import { Button } from "~/src/components/shadcn/button";

import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";

interface ProductEditorHeaderProps {
  readonly isNew?: boolean;
  readonly handle?: string;
  readonly status: "draft" | "active" | "archived";
}

const STATUS_STYLE_MAP = {
  active: "bg-emerald-500/10 text-emerald-600",
  archived: "bg-muted text-muted-foreground",
  draft: "bg-amber-500/10 text-amber-600"
} as const;

export function ProductEditorHeader({ isNew = false, handle, status }: Readonly<ProductEditorHeaderProps>): JSX.Element {
  const t = useTranslations("admin");

  const statusLabel = {
    active: t("newProduct.status.active"),
    archived: t("newProduct.status.archived"),
    draft: t("newProduct.status.draft")
  }[status];

  const titleText = isNew ? t("newProduct.title") : (handle ?? t("newProduct.editTitle"));
  const actionLabel = isNew ? t("newProduct.actions.publish") : t("newProduct.actions.saveChanges");

  const breadcrumbs = useMemo(
    () => [
      { href: CONSTANTS.ROUTES.ADMIN, label: t("nav.dashboard") },
      { href: CONSTANTS.ROUTES.ADMIN_CATALOG, label: t("nav.catalog") },
      { href: CONSTANTS.ROUTES.ADMIN_PRODUCTS, label: t("nav.products") }
    ],
    [t]
  );

  const titleNode = useMemo(
    () => (
      <div className="flex items-center gap-3">
        <span>{titleText}</span>
        <Badge
          variant="outline"
          className={`cursor-pointer gap-1 border-0 px-2 py-0.5 text-[11px] font-medium tracking-wider uppercase ${STATUS_STYLE_MAP[status]}`}
        >
          {status === "active" && <Check className="size-3" strokeWidth={2} />}
          {statusLabel}
        </Badge>
      </div>
    ),
    [titleText, status, statusLabel]
  );

  const headerActions = useMemo(
    () => (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-3 text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {t("newProduct.actions.discard")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-sidebar-border bg-sidebar px-3 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Eye className="size-3.5" strokeWidth={1.5} />
          {t("newProduct.actions.saveDraft")}
        </Button>
        <Button size="sm" className="h-8 gap-1.5 bg-foreground px-4 text-[13px] text-background hover:bg-foreground/90">
          <Check className="size-3.5" strokeWidth={2} />
          {actionLabel}
        </Button>
      </>
    ),
    [actionLabel, t]
  );

  return (
    <div className="sticky top-0 z-20 flex flex-col bg-background">
      <AdminHeader backHref={CONSTANTS.ROUTES.ADMIN_PRODUCTS} breadcrumbs={breadcrumbs} title={titleNode} actions={headerActions} />
    </div>
  );
}
