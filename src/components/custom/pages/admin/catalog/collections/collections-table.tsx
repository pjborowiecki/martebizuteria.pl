"";

import { type JSX, type MouseEvent, useCallback, useMemo } from "react";

import { useRouter } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Badge } from "~/src/components/shadcn/badge";
import { Card, CardContent } from "~/src/components/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/components/shadcn/table";

import { Image } from "~/src/components/custom/image";
import { CollectionsRowActions } from "~/src/components/custom/pages/admin/catalog/collections/collections-row-actions";

import type { CollectionItem } from "~/src/data/collections-data";

export function CollectionsTable({ collections }: Readonly<{ collections: readonly CollectionItem[] }>): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card className="border-border/40 bg-linear-to-br from-pink-500/10 via-rose-500/5 to-transparent">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40"
              strokeWidth={1.5}
            />
            <input
              type="text"
              placeholder={t("collections.searchPlaceholder")}
              className="h-9 w-72 rounded-lg border border-border/50 bg-background pr-4 pl-10 text-sm transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:outline-none"
            />
          </div>
        </div>

        <Table>
          <CollectionsTableHeader />
          <TableBody>
            {collections.map((col) => (
              <CollectionRow key={col.id} collection={col} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CollectionsTableHeader(): JSX.Element {
  const t = useTranslations("admin");
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-12 pl-6">
          <input type="checkbox" className="size-4 rounded border-border accent-foreground" />
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("collections.columns.collection")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("collections.columns.slug")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("collections.columns.description")}
        </TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("collections.columns.products")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("collections.columns.status")}
        </TableHead>
        <TableHead className="w-12 pr-6" />
      </TableRow>
    </TableHeader>
  );
}

function CollectionRow({ collection }: Readonly<{ collection: CollectionItem }>): JSX.Element {
  const t = useTranslations("admin");
  const router = useRouter();

  const handleRowClick = useCallback(() => {
    const prefix = "/{-$locale}" as const;
    void router.navigate({
      params: { handle: String(collection.id) },
      to: `${prefix}${CONSTANTS.ROUTES.ADMIN_COLLECTIONS}/$handle`
    });
  }, [router, collection.id]);

  const handleCheckboxClick = useCallback((e: MouseEvent<HTMLTableCellElement>) => {
    e.stopPropagation();
  }, []);

  const handleActionsClick = useCallback((e: MouseEvent<HTMLTableCellElement>) => {
    e.stopPropagation();
  }, []);

  const isStatusActive = collection.status === "active";

  const statusBadge = useMemo(
    () => (
      <Badge variant={isStatusActive ? "default" : "secondary"} className="text-[11px]">
        {isStatusActive ? t("collections.statusActive") : t("collections.statusDraft")}
      </Badge>
    ),
    [isStatusActive, t]
  );

  return (
    <TableRow className="group cursor-pointer" onClick={handleRowClick}>
      <TableCell className="pl-6" onClick={handleCheckboxClick}>
        <input type="checkbox" className="size-4 rounded border-border accent-foreground" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-secondary">
            <Image src={collection.image} alt={collection.name} width={36} height={36} className="object-cover" />
          </div>
          <span className="text-sm font-medium">{collection.name}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">{collection.slug}</TableCell>
      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{collection.description}</TableCell>
      <TableCell className="text-right font-mono text-sm">{collection.products}</TableCell>
      <TableCell>{statusBadge}</TableCell>
      <TableCell className="pr-6" onClick={handleActionsClick}>
        <CollectionsRowActions collectionId={collection.id} />
      </TableCell>
    </TableRow>
  );
}
