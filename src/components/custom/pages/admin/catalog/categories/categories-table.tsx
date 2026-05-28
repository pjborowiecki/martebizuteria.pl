import { type JSX, type MouseEvent, useCallback, useMemo } from "react";

import { useRouter } from "@tanstack/react-router";
import { FolderOpen, Search } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Badge } from "~/src/components/shadcn/badge";
import { Card, CardContent } from "~/src/components/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/components/shadcn/table";

import { CategoriesRowActions } from "~/src/components/custom/pages/admin/catalog/categories/categories-row-actions";

import type { CategoryItem } from "~/src/data/categories-data";

export function CategoriesTable({ categories }: Readonly<{ categories: readonly CategoryItem[] }>): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Card className="border-border/40 bg-linear-to-br from-pink-500/10 via-rose-500/5 to-transparent shadow-none">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40"
              strokeWidth={1.5}
            />
            <input
              type="text"
              placeholder={t("categories.searchPlaceholder")}
              className="h-9 w-72 rounded-lg border border-border/50 bg-background pr-4 pl-10 text-sm transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:outline-none"
            />
          </div>
        </div>

        <Table>
          <CategoriesTableHeader />
          <TableBody>
            {categories.map((cat) => (
              <CategoryRow key={cat.id} category={cat} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CategoriesTableHeader(): JSX.Element {
  const t = useTranslations("admin");
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-12 pl-6">
          <input type="checkbox" className="size-4 rounded border-border accent-foreground" />
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("categories.columns.name")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("categories.columns.slug")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("categories.columns.description")}
        </TableHead>
        <TableHead className="text-right text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("categories.columns.products")}
        </TableHead>
        <TableHead className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">
          {t("categories.columns.status")}
        </TableHead>
        <TableHead className="w-12 pr-6" />
      </TableRow>
    </TableHeader>
  );
}

function CategoryRow({ category }: Readonly<{ category: CategoryItem }>): JSX.Element {
  const t = useTranslations("admin");
  const router = useRouter();

  const handleRowClick = useCallback(() => {
    const prefix = "/{-$locale}" as const;
    void router.navigate({
      params: { handle: String(category.id) },
      to: `${prefix}${CONSTANTS.ROUTES.ADMIN_CATEGORIES}/$handle`
    });
  }, [router, category.id]);

  const handleCheckboxClick = useCallback((e: MouseEvent<HTMLTableCellElement>) => {
    e.stopPropagation();
  }, []);

  const handleActionsClick = useCallback((e: MouseEvent<HTMLTableCellElement>) => {
    e.stopPropagation();
  }, []);

  const isStatusActive = category.status === "active";

  const statusBadge = useMemo(
    () => (
      <Badge variant={isStatusActive ? "default" : "secondary"} className="text-[11px]">
        {isStatusActive ? t("categories.statusActive") : t("categories.statusDraft")}
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
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <FolderOpen className="size-4 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-medium">{category.name}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">{category.slug}</TableCell>
      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{category.description}</TableCell>
      <TableCell className="text-right font-mono text-sm">{category.products}</TableCell>
      <TableCell>{statusBadge}</TableCell>
      <TableCell className="pr-6" onClick={handleActionsClick}>
        <CategoriesRowActions categoryId={category.id} />
      </TableCell>
    </TableRow>
  );
}
