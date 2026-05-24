import { type JSX, useCallback, useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { Check, Eye, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Badge } from "~/src/components/shadcn/badge";
import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent } from "~/src/components/shadcn/card";
import { Switch } from "~/src/components/shadcn/switch";

import { type LocalizedTo } from "~/src/components/custom/localized-link";
import { AdminHeader } from "~/src/components/custom/pages/admin/admin-header";
import { CollectionBasicInfo } from "~/src/components/custom/pages/admin/catalog/collections/collection-detail/collection-basic-info";
import { CollectionMedia } from "~/src/components/custom/pages/admin/catalog/collections/collection-detail/collection-media";
import { CollectionSeo } from "~/src/components/custom/pages/admin/catalog/collections/collection-detail/collection-seo";
import { CollectionStatus } from "~/src/components/custom/pages/admin/catalog/collections/collection-detail/collection-status";

import { MOCK_COLLECTIONS } from "~/src/data/collections-data";

export const Route = createFileRoute("/{-$locale}/admin/catalog/collections/$handle")({
  component: AdminCollectionDetailRoute
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/(^-|-$)/gu, "");
}

function AdminCollectionDetailRoute(): JSX.Element {
  const { handle } = Route.useParams();
  const t = useTranslations("admin");
  const isNew = handle === "new";
  const existing = isNew ? undefined : MOCK_COLLECTIONS[handle];

  const [name, setName] = useState(existing?.name ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [status, setStatus] = useState<"draft" | "active">(existing?.status ?? "draft");
  const [metaTitle, setMetaTitle] = useState(existing?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(existing?.metaDescription ?? "");
  const [featured, setFeatured] = useState(existing?.featured ?? false);
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
      { href: CONSTANTS.ROUTES.ADMIN, label: t("nav.dashboard") } satisfies { href: LocalizedTo; label: string },
      { href: CONSTANTS.ROUTES.ADMIN_CATALOG, label: t("nav.catalog") } satisfies { href: LocalizedTo; label: string },
      { href: CONSTANTS.ROUTES.ADMIN_COLLECTIONS, label: t("collections.title") } satisfies { href: LocalizedTo; label: string }
    ],
    [t]
  );

  const headerTitle = useMemo(
    () => (
      <div className="flex items-center gap-3">
        <span>{isNew ? t("collections.form.titleAdd") : name || "Untitled Collection"}</span>
        <Badge
          variant="outline"
          className={`cursor-pointer gap-1 border-0 px-2 py-0.5 text-[11px] font-medium tracking-wider uppercase ${getStatusBadgeStyle(status)}`}
        >
          {status === "active" ? t("collections.statusActive") : t("collections.statusDraft")}
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
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-3 text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Trash2 className="size-3.5" strokeWidth={1.5} />
            {t("collections.form.delete")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-3 text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {t("collections.form.cancel")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-sidebar-border bg-sidebar px-3 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Eye className="size-3.5" strokeWidth={1.5} />
          {t("collections.form.saveDraft")}
        </Button>
        <Button size="sm" className="h-8 gap-1.5 bg-foreground px-4 text-[13px] text-background hover:bg-foreground/90">
          <Check className="size-3.5" strokeWidth={2} />
          {isNew ? t("collections.form.create") : t("collections.form.save")}
        </Button>
      </>
    ),
    [isNew, t]
  );

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <AdminHeader backHref={CONSTANTS.ROUTES.ADMIN_COLLECTIONS} breadcrumbs={breadcrumbs} title={headerTitle} actions={headerActions} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full gap-x-10 gap-y-0 px-8 py-6 xl:grid-cols-[1fr_340px]">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            <CollectionBasicInfo
              description={description}
              isNew={isNew}
              name={name}
              onDescriptionChange={setDescription}
              onNameChange={handleNameChange}
              onSlugChange={setSlug}
              slug={slug}
            />
            <CollectionMedia image={image} onImageChange={setImage} />
            <CollectionSeo
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
            <CollectionStatus featured={featured} onFeaturedChange={setFeatured} onStatusChange={setStatus} status={status} />
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
      <CardContent className="space-y-4 pt-6">
        <span className="text-[13px] font-semibold">{t("collections.form.displayOptions")}</span>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-foreground/70">{t("collections.form.showOnHomepage")}</span>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-foreground/70">{t("collections.form.showInNav")}</span>
            <Switch defaultChecked />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ existing, handle }: { readonly existing: (typeof MOCK_COLLECTIONS)[string]; readonly handle: string }): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <span className="text-[13px] font-semibold">{t("collections.form.summary")}</span>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-foreground/70">{t("collections.form.products")}</span>
            <span className="font-mono text-[13px] font-medium">{existing.products}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-foreground/70">{t("collections.form.id")}</span>
            <span className="font-mono text-[12px] text-muted-foreground/60">COL-{handle}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-foreground/70">{t("collections.form.created")}</span>
            <span className="text-[12px] text-muted-foreground/60">{existing.created}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-foreground/70">{t("collections.form.updated")}</span>
            <span className="text-[12px] text-muted-foreground/60">{existing.updated}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
