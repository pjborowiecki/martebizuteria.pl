import type { JSX } from "react";

import { Bold, Italic, Link2, List } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Input } from "~/src/components/shadcn/input";
import { Label } from "~/src/components/shadcn/label";
import { Textarea } from "~/src/components/shadcn/textarea";

import type { ProductRecord } from "~/src/data/catalog-data";

interface ProductEditorBasicProps {
  readonly initialData?: ProductRecord;
}

export function ProductEditorBasic({ initialData }: ProductEditorBasicProps): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("basic.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>{t("basic.name")}</Label>
            <Input type="text" placeholder={t("basic.namePlaceholder")} defaultValue={initialData?.name ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>{t("basic.ref")}</Label>
            <Input
              type="text"
              placeholder="MR-000"
              className="font-mono"
              defaultValue={initialData?.id === undefined ? "" : `MR-${initialData.id}`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("basic.description")}</Label>
          <div className="overflow-hidden rounded-md border border-border transition-all focus-within:border-foreground">
            <FormattingToolbar />
            <Textarea
              rows={4}
              placeholder={t("basic.descriptionPlaceholder")}
              className="resize-none border-0 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FormattingToolbar(): JSX.Element {
  return (
    <div className="flex items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
      {[Bold, Italic, List, Link2].map((Icon) => (
        <button
          key={Icon.displayName ?? Icon.name}
          type="button"
          className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <Icon className="size-3.5" strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
