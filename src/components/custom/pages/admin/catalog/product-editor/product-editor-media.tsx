import type { JSX } from "react";

import { Upload } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";

export function ProductEditorMedia(): JSX.Element {
  const t = useTranslations("admin.newProduct");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("media.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <UploadButton />
        </div>
      </CardContent>
    </Card>
  );
}

function UploadButton(): JSX.Element {
  const t = useTranslations("admin.newProduct");

  return (
    <button
      type="button"
      aria-label={t("media.dragDrop")}
      className="flex w-full max-w-[280px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30 transition-all hover:border-foreground/20 hover:bg-muted/50"
    >
      <div className="flex flex-col items-center gap-2 py-10">
        <div className="flex size-10 items-center justify-center rounded-full bg-foreground/5">
          <Upload className="size-5 text-muted-foreground/60" strokeWidth={1.5} />
        </div>
        <p className="text-[13px] font-medium">{t("media.dragDrop")}</p>
        <p className="text-[11px] text-muted-foreground/60">{t("media.formats")}</p>
      </div>
    </button>
  );
}
