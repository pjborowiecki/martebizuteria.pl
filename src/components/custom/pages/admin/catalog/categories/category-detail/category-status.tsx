import { type JSX, useCallback } from "react";

import { Package } from "lucide-react";
import { useTranslations } from "use-intl";

import { Card, CardContent } from "~/src/components/shadcn/card";
import { Label } from "~/src/components/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";
import { Switch } from "~/src/components/shadcn/switch";

export interface CategoryStatusProps {
  featured: boolean;
  onFeaturedChange: (val: boolean) => void;
  onStatusChange: (val: "active" | "draft") => void;
  status: "active" | "draft";
}

export function CategoryStatus({ featured, onFeaturedChange, onStatusChange, status }: Readonly<CategoryStatusProps>): JSX.Element {
  const t = useTranslations("admin");

  const handleStatusChange = useCallback(
    (val: "active" | "draft" | null) => {
      if (val !== null) {
        onStatusChange(val);
      }
    },
    [onStatusChange]
  );

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Package className="size-4 text-muted-foreground/60" strokeWidth={1.5} />
          <span className="text-[14px] font-medium">{t("categories.form.status")}</span>
        </div>
        <div className="space-y-5">
          <div className="relative">
            <StatusSelect status={status} onStatusChange={handleStatusChange} />
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-5">
            <Label className="font-normal text-muted-foreground">{t("categories.form.featuredLabel")}</Label>
            <Switch checked={featured} onCheckedChange={onFeaturedChange} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusSelect({
  status,
  onStatusChange
}: Readonly<{
  status: "active" | "draft";
  onStatusChange: (val: "active" | "draft" | null) => void;
}>): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Select value={status} onValueChange={onStatusChange}>
      <SelectTrigger
        aria-label={t("categories.form.status")}
        className="min-h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm shadow-none ring-0 transition-[color,background-color,border-color] outline-none focus-visible:border-foreground focus-visible:ring-0 data-[state=open]:border-foreground [&>svg]:opacity-50"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="draft">{t("categories.statusDraft")}</SelectItem>
        <SelectItem value="active">{t("categories.statusActive")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
