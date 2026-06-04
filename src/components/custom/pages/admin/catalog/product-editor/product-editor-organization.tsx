import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Label } from "~/src/components/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { CATEGORIES, COLLECTIONS, MATERIALS } from "~/src/data/catalog-data";

export function ProductEditorOrganization(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("organization.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t("organization.category")}</Label>
          <Select>
            <SelectTrigger className="min-h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm shadow-none ring-0 transition-[color,background-color,border-color] outline-none focus-visible:border-foreground focus-visible:ring-0 data-[state=open]:border-foreground [&>svg]:opacity-50">
              <SelectValue placeholder={t("organization.selectCategory")} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("organization.collection")}</Label>
          <Select>
            <SelectTrigger className="min-h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm shadow-none ring-0 transition-[color,background-color,border-color] outline-none focus-visible:border-foreground focus-visible:ring-0 data-[state=open]:border-foreground [&>svg]:opacity-50">
              <SelectValue placeholder={t("organization.selectCollection")} />
            </SelectTrigger>
            <SelectContent>
              {COLLECTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("basic.material")}</Label>
          <Select>
            <SelectTrigger className="min-h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm shadow-none ring-0 transition-[color,background-color,border-color] outline-none focus-visible:border-foreground focus-visible:ring-0 data-[state=open]:border-foreground [&>svg]:opacity-50">
              <SelectValue placeholder={t("basic.selectMaterial")} />
            </SelectTrigger>
            <SelectContent>
              {MATERIALS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
