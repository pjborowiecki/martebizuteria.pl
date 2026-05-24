import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";
import { Label } from "~/src/components/shadcn/label";
import { Textarea } from "~/src/components/shadcn/textarea";

export function ProductEditorSeo(): JSX.Element {
  const t = useTranslations("admin.newProduct");

  return (
    <Card className="mb-10">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("seo.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-secondary/30 p-4 ring-1 ring-border/30">
          <p className="text-[14px] leading-none font-medium text-blue-600">Product name — M&apos;ARTE</p>
          <p className="mt-1.5 truncate text-[13px] text-emerald-700">marte.com/products/product-name</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{t("seo.metaDescriptionPlaceholder")}</p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meta-title">{t("seo.metaTitle")}</Label>
              <span className="text-[12px] text-muted-foreground">0/60</span>
            </div>
            <Input id="meta-title" type="text" placeholder={t("seo.metaTitlePlaceholder")} />
          </div>
          <div className="space-y-2">
            <div className="flex h-5 items-center">
              <Label htmlFor="meta-slug">{t("seo.slug")}</Label>
            </div>
            <InputGroup>
              <InputGroupAddon className="text-sm font-normal text-muted-foreground">/products/</InputGroupAddon>
              <InputGroupInput id="meta-slug" type="text" placeholder="product-name" />
            </InputGroup>
          </div>
          <div className="col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="meta-description">{t("seo.metaDescription")}</Label>
              <span className="text-[12px] text-muted-foreground">0/160</span>
            </div>
            <Textarea id="meta-description" rows={2} placeholder={t("seo.metaDescriptionPlaceholder")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
