import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Input } from "~/src/components/shadcn/input";
import { Label } from "~/src/components/shadcn/label";

import type { ProductRecord } from "~/src/data/catalog-data";

const DEFAULT_STOCK = 0;

interface ProductEditorPricingProps {
  readonly initialData?: ProductRecord;
}

export function ProductEditorPricing({ initialData }: Readonly<ProductEditorPricingProps>): JSX.Element {
  const t = useTranslations("admin.newProduct");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("pricing.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>{t("pricing.price")}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground/40">$</span>
              <Input
                type="text"
                placeholder="199.00"
                className="pl-7 font-mono"
                defaultValue={initialData?.price.replaceAll(/[^0-9.]/gu, "") ?? ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("pricing.compareAt")}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground/40">$</span>
              <Input type="text" placeholder="0.00" className="pl-7 font-mono" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>{t("pricing.cost")}</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground/40">$</span>
              <Input type="text" placeholder="0.00" className="pl-7 font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("inventory.quantity")}</Label>
            <Input type="number" defaultValue={initialData?.stock ?? DEFAULT_STOCK} min={DEFAULT_STOCK} className="font-mono" />
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground">{t("pricing.hint")}</p>
      </CardContent>
    </Card>
  );
}
