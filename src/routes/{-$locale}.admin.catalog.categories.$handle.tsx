import { type JSX, useCallback, useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Check, Eye } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Badge } from "~/src/components/shadcn/badge";
import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent } from "~/src/components/shadcn/card";
import { Label } from "~/src/components/shadcn/label";
import { Switch } from "~/src/components/shadcn/switch";

import { type LocalizedTo } from "~/src/components/custom/localized-link";
import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { CategoryBasicInfo } from "~/src/components/custom/pages/admin/catalog/categories/category-detail/category-basic-info";
import { CategoryMedia } from "~/src/components/custom/pages/admin/catalog/categories/category-detail/category-media";
import { CategorySeo } from "~/src/components/custom/pages/admin/catalog/categories/category-detail/category-seo";
import { CategoryStatus } from "~/src/components/custom/pages/admin/catalog/categories/category-detail/category-status";

import { MOCK_CATEGORIES } from "~/src/data/categories-data";

export const Route = createFileRoute("/{-$locale}/admin/catalog/categories/$handle")({
  component: AdminCategoryDetailRoute
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/(^-|-$)/gu, "");
}

function AdminCategoryDetailRoute(): JSX.Element {
  const { handle } = Route.useParams();
  const t = useTranslations("admin");
  const isNew = handle === "new";
  const existing = isNew ? undefined : MOCK_CATEGORIES[handle];

  const [name, setName] = useState(existing?.name ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [status, setStatus] = useState<"draft" | "active">(existing?.status ?? "draft");
  const [metaTitle, setMetaTitle] = useState(existing?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(existing?.metaDescription ?? "");
  const [featured, setFeatured] = useState(existing?.featured ?? false);
  const [parent, setParent] = useState(existing?.parent ?? "");
  const [image, setImage] = useState(existing?.image ?? "");

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (isNew) {
        setSlug(slugify(value));
      }
    },
    [isNew]
  );

  const getStatusBadgeStyle = useCallback(
    (s: string) => (s === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"),
    []
  );

  const breadcrumbs = useMemo(
    () => [
      { href: CONSTANTS.ROUTES.ADMIN, label: t("nav.dashboard") } satisfies {
        href: LocalizedTo;
        label: string;
      },
      { href: CONSTANTS.ROUTES.ADMIN_CATALOG, label: t("nav.catalog") } satisfies {
        href: LocalizedTo;
        label: string;
      },
      { href: CONSTANTS.ROUTES.ADMIN_CATEGORIES, label: t("categories.title") } satisfies {
        href: LocalizedTo;
        label: string;
      }
    ],
    [t]
  );

  const headerTitle = useMemo(
    () => (
      <div className="flex items-center gap-3">
        <span>{isNew ? t("categories.form.titleAdd") : name || "Untitled Category"}</span>
        <Badge
          variant="outline"
          className={`cursor-pointer gap-1 border-0 px-2 py-0.5 text-[11px] font-medium tracking-wider uppercase ${getStatusBadgeStyle(status)}`}
        >
          {status === "active" && <Check className="size-3" strokeWidth={2} />}
          {status === "active" ? t("categories.statusActive") : t("categories.statusDraft")}
        </Badge>
      </div>
    ),
    [isNew, name, status, t, getStatusBadgeStyle]
  );

  const headerActions = useMemo(
    () => (
      <>
        {!isNew && (
          <Button
            variant="outline"
            className="h-9 gap-2 border-sidebar-border bg-sidebar text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            size="sm"
          >
            <Eye className="size-4" strokeWidth={1.5} />
            {t("categories.rowActions.viewProducts")}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-sidebar-border bg-sidebar px-3 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Eye className="size-3.5" strokeWidth={1.5} />
          {t("categories.form.saveDraft")}
        </Button>
        <Button size="sm" className="h-8 gap-1.5 bg-foreground px-4 text-[13px] text-background hover:bg-foreground/90">
          <Check className="size-3.5" strokeWidth={2} />
          {isNew ? t("categories.form.create") : t("categories.form.save")}
        </Button>
      </>
    ),
    [isNew, t]
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <AdminHeader backHref={CONSTANTS.ROUTES.ADMIN_CATEGORIES} breadcrumbs={breadcrumbs} title={headerTitle} actions={headerActions} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full gap-x-10 gap-y-0 px-8 py-6 xl:grid-cols-[1fr_340px]">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            <CategoryBasicInfo
              description={description}
              isNew={isNew}
              name={name}
              onDescriptionChange={setDescription}
              onNameChange={handleNameChange}
              onParentChange={setParent}
              onSlugChange={setSlug}
              parent={parent}
              slug={slug}
            />
            <CategoryMedia image={image} onImageChange={setImage} />
            <CategorySeo
              description={description}
              metaDescription={metaDescription}
              metaTitle={metaTitle}
              name={name}
              onMetaDescriptionChange={setMetaDescription}
              onMetaTitleChange={setMetaTitle}
              onSlugChange={setSlug}
              slug={slug}
            />
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            <CategoryStatus featured={featured} onFeaturedChange={setFeatured} onStatusChange={setStatus} status={status} />
            <DisplayOptionsCard />
            {!isNew && existing !== undefined && <SummaryCard existing={existing} handle={handle} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function DisplayOptionsCard(): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card>
      <CardContent className="p-5">
        <span className="mb-5 block text-[14px] font-medium">{t("categories.form.displayOptions")}</span>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-normal text-muted-foreground">{t("categories.form.showInNav")}</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-normal text-muted-foreground">{t("categories.form.showInFilters")}</Label>
            <Switch defaultChecked />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ existing, handle }: { readonly existing: (typeof MOCK_CATEGORIES)[string]; readonly handle: string }): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card>
      <CardContent className="p-5">
        <span className="mb-5 block text-[14px] font-medium">{t("categories.form.summary")}</span>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">{t("categories.form.products")}</span>
            <span className="font-mono text-[13px] font-medium">{existing.products}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">{t("categories.form.id")}</span>
            <span className="font-mono text-[12px] text-muted-foreground/70">
              CAT-
              {handle}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">{t("categories.form.created")}</span>
            <span className="text-[12px] text-muted-foreground/70">{existing.created}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-muted-foreground">{t("categories.form.updated")}</span>
            <span className="text-[12px] text-muted-foreground/70">{existing.updated}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
